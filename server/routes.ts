import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPropertySchema, updatePropertySchema } from "@shared/schema";
import { calculateTotalScore, getEMDRecommendation } from "@shared/scoring";
import { savePropertyToSheet, exportPipelineToSheet } from "./lib/googleSheets";
import { generatePropertyAnalysis } from "./lib/openai";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get user by email (or create if doesn't exist)
  app.post("/api/users/login", async (req, res) => {
    try {
      const { name, email } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required" });
      }

      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        user = await storage.createUser({ name, email });
      }

      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create property
  app.post("/api/properties", async (req, res) => {
    try {
      const { email, ...propertyData } = req.body;
      console.log('[DEBUG POST /api/properties] Received email:', email);
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      // Get or create user by email
      let user = await storage.getUserByEmail(email);
      console.log('[DEBUG POST /api/properties] Found user:', user);
      
      if (!user) {
        console.log('[DEBUG POST /api/properties] User not found, creating new user');
        // Create user with email if they don't exist
        user = await storage.createUser({
          name: 'User',  // Default name
          email
        });
        console.log('[DEBUG POST /api/properties] Created user:', user);
      }
      
      // Add userId to property data
      const dataWithUserId = {
        ...propertyData,
        userId: user.id
      };
      
      const validatedData = insertPropertySchema.parse(dataWithUserId);
      
      // Calculate score and EMD recommendation
      const totalScore = calculateTotalScore(validatedData);
      const emdRecommendation = getEMDRecommendation(totalScore);
      
      const propertyWithScore = {
        ...validatedData,
        totalScore,
        emdRecommendation: emdRecommendation.emd,
        successChance: emdRecommendation.chance
      };

      const property = await storage.createProperty(propertyWithScore);
      res.json(property);
    } catch (error: any) {
      console.error('[DEBUG POST /api/properties] Error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Update property
  app.patch("/api/properties/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { email, ...propertyData } = req.body;
      
      // Get user by email if provided
      let dataWithUserId = { ...propertyData, id };
      if (email) {
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return res.status(400).json({ error: "User not found" });
        }
        dataWithUserId.userId = user.id;
      }
      
      const validatedData = updatePropertySchema.parse(dataWithUserId);
      
      // Recalculate score if risk assessment fields changed
      const totalScore = calculateTotalScore(validatedData);
      const emdRecommendation = getEMDRecommendation(totalScore);
      
      const propertyWithScore = {
        ...validatedData,
        totalScore,
        emdRecommendation: emdRecommendation.emd,
        successChance: emdRecommendation.chance
      };

      const property = await storage.updateProperty(id, propertyWithScore);
      res.json(property);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get property by ID
  app.get("/api/properties/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const property = await storage.getProperty(id);
      
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      res.json(property);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get most recent property for a user
  app.get("/api/users/:email/recent-property", async (req, res) => {
    try {
      const { email } = req.params;
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.json(null);
      }

      const properties = await storage.getPropertiesByUserId(user.id);
      
      if (properties.length === 0) {
        return res.json(null);
      }

      // Return most recently updated property
      const sortedProperties = properties.sort((a, b) => {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return timeB - timeA;
      });

      res.json(sortedProperties[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all properties for a user
  app.get("/api/users/:email/properties", async (req, res) => {
    try {
      const { email } = req.params;
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json([]);
      }
      const properties = await storage.getPropertiesByUserId(user.id);
      const sorted = properties.sort((a, b) => {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return timeB - timeA;
      });
      res.json(sorted);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Save property to Google Sheets
  app.post("/api/properties/:id/save-to-sheets", async (req, res) => {
    try {
      const { id } = req.params;
      const property = await storage.getProperty(id);
      
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      const result = await savePropertyToSheet(property);
      res.json(result);
    } catch (error: any) {
      console.error('Google Sheets save error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Export the pipeline view to a new Google spreadsheet
  app.post("/api/pipeline/export-to-sheets", async (req, res) => {
    try {
      const { title, headers, rows } = req.body;
      if (!Array.isArray(headers) || !Array.isArray(rows)) {
        return res
          .status(400)
          .json({ error: "headers and rows are required" });
      }
      const result = await exportPipelineToSheet(
        typeof title === "string" && title.trim() ? title : "MoM Pipeline Report",
        headers,
        rows,
      );
      res.json(result);
    } catch (error: any) {
      console.error("Pipeline export error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate AI analysis
  app.post("/api/properties/:id/analyze", async (req, res) => {
    try {
      const { id } = req.params;
      const property = await storage.getProperty(id);
      
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      const totalScore = property.totalScore || 0;
      const emdRecommendation = getEMDRecommendation(totalScore);

      const analysis = await generatePropertyAnalysis(property, totalScore, emdRecommendation);
      
      // Update property with AI analysis
      const updatedProperty = await storage.updateProperty(id, {
        aiAnalysis: analysis
      });

      res.json(analysis);
    } catch (error: any) {
      console.error('AI analysis error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Fetch mock Zillow data
  app.post("/api/properties/zillow", async (req, res) => {
    try {
      const { address } = req.body;
      
      if (!address) {
        return res.status(400).json({ error: "Address is required" });
      }

      // Mock Zillow data
      const mockData = {
        address: address,
        zpid: Math.random().toString(36).substring(7),
        price: Math.floor(Math.random() * 500000) + 500000,
        bedrooms: Math.floor(Math.random() * 3) + 2,
        bathrooms: Math.floor(Math.random() * 2) + 1.5,
        sqft: Math.floor(Math.random() * 1000) + 1500,
        lotSize: Math.floor(Math.random() * 5000) + 5000,
        yearBuilt: Math.floor(Math.random() * 40) + 1970,
        zestimate: Math.floor(Math.random() * 600000) + 600000
      };

      res.json(mockData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
