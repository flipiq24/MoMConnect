import { type User, type InsertUser, type Property, type InsertProperty, type UpdateProperty } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Property operations
  getProperty(id: string): Promise<Property | undefined>;
  getPropertiesByUserId(userId: string): Promise<Property[]>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, property: UpdateProperty): Promise<Property>;
  deleteProperty(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private properties: Map<string, Property>;

  constructor() {
    this.users = new Map();
    this.properties = new Map();
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  // Property operations
  async getProperty(id: string): Promise<Property | undefined> {
    return this.properties.get(id);
  }

  async getPropertiesByUserId(userId: string): Promise<Property[]> {
    return Array.from(this.properties.values()).filter(
      (property) => property.userId === userId
    );
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const id = randomUUID();
    
    // Get or create user
    let user = await this.getUserByEmail(insertProperty.email);
    if (!user) {
      user = await this.createUser({
        name: 'User',
        email: insertProperty.email
      });
    }

    const property: Property = {
      id,
      userId: user.id,
      address: insertProperty.address,
      daysInMLS: insertProperty.daysInMLS || null,
      purchasePriceRange: insertProperty.purchasePriceRange || null,
      valueSubjectToPermits: insertProperty.valueSubjectToPermits || null,
      valueSubjectToADU: insertProperty.valueSubjectToADU || null,
      wholesalePriceVsAsking: insertProperty.wholesalePriceVsAsking || null,
      arvConfidence: insertProperty.arvConfidence || null,
      roiForTimeEffort: insertProperty.roiForTimeEffort || null,
      zoning: insertProperty.zoning || null,
      rehabLevel: insertProperty.rehabLevel || null,
      areaDesirability: insertProperty.areaDesirability || null,
      obsolescencesIssues: insertProperty.obsolescencesIssues || null,
      occupancy: insertProperty.occupancy || null,
      purchasePrice: insertProperty.purchasePrice || null,
      estimatedRehab: insertProperty.estimatedRehab || null,
      arv: insertProperty.arv || null,
      totalScore: insertProperty.totalScore || 0,
      emdRecommendation: insertProperty.emdRecommendation || null,
      successChance: insertProperty.successChance || null,
      zillowData: insertProperty.zillowData || null,
      aiAnalysis: insertProperty.aiAnalysis || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.properties.set(id, property);
    return property;
  }

  async updateProperty(id: string, updateData: UpdateProperty): Promise<Property> {
    const existing = this.properties.get(id);
    if (!existing) {
      throw new Error('Property not found');
    }

    const updated: Property = {
      ...existing,
      ...updateData,
      id: existing.id,
      userId: existing.userId,
      updatedAt: new Date()
    };

    this.properties.set(id, updated);
    return updated;
  }

  async deleteProperty(id: string): Promise<boolean> {
    return this.properties.delete(id);
  }
}

export const storage = new MemStorage();
