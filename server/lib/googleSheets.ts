// Integration: google-sheet connector (connection:conn_google-sheet_01K7JRDDM0HSKKVSSBFWC72CDD)
import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-sheet',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Sheet not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGoogleSheetClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.sheets({ version: 'v4', auth: oauth2Client });
}

// Save property data to Google Sheets
export async function savePropertyToSheet(propertyData: any) {
  try {
    const sheets = await getUncachableGoogleSheetClient();
    
    // Get or create spreadsheet ID from environment or create new one
    let spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    if (!spreadsheetId) {
      // Create a new spreadsheet
      const createResponse = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: 'MoM Wholesale Properties'
          },
          sheets: [{
            properties: {
              title: 'Properties',
              gridProperties: {
                frozenRowCount: 1
              }
            }
          }]
        }
      });
      
      spreadsheetId = createResponse.data.spreadsheetId!;
      
      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Properties!A1:Z1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            'Timestamp',
            'User Email',
            'Address',
            'Purchase Price',
            'Estimated Rehab',
            'ARV',
            'Total Score',
            'EMD Recommendation',
            'Success Chance (%)',
            'Days in MLS',
            'Purchase Price Range',
            'Value Subject to Permits',
            'Value Subject to ADU',
            'Wholesale Price vs Asking',
            'ARV Confidence',
            'ROI for Time/Effort',
            'Zoning',
            'Rehab Level',
            'Area Desirability',
            'Obsolescences/Issues',
            'Occupancy'
          ]]
        }
      });
    }
    
    // Append property data
    const values = [[
      new Date().toISOString(),
      propertyData.email || '',
      propertyData.address || '',
      propertyData.purchasePrice || '',
      propertyData.estimatedRehab || '',
      propertyData.arv || '',
      propertyData.totalScore || 0,
      propertyData.emdRecommendation || '',
      propertyData.successChance || 0,
      propertyData.daysInMLS || '',
      propertyData.purchasePriceRange || '',
      propertyData.valueSubjectToPermits || '',
      propertyData.valueSubjectToADU || '',
      propertyData.wholesalePriceVsAsking || '',
      propertyData.arvConfidence || '',
      propertyData.roiForTimeEffort || '',
      propertyData.zoning || '',
      propertyData.rehabLevel || '',
      propertyData.areaDesirability || '',
      propertyData.obsolescencesIssues || '',
      propertyData.occupancy || ''
    ]];
    
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Properties!A:Z',
      valueInputOption: 'RAW',
      requestBody: {
        values
      }
    });
    
    return { success: true, spreadsheetId };
  } catch (error) {
    console.error('Error saving to Google Sheets:', error);
    throw error;
  }
}
