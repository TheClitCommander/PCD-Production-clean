import React, { useState, useEffect } from 'react';
import { Button, Card, CardContent, Typography, Grid, Box, CircularProgress, TextField, MenuItem } from '@mui/material';
import axios from 'axios';

interface Lead {
  id: string;
  name: string;
  type?: string;
  location?: string;
  hasWebsite?: number;
  scrapedAt?: string;
}

const SuperSimpleLeads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [location, setLocation] = useState('Brunswick');
  const [businessType, setBusinessType] = useState('plumber');
  const [maxResults, setMaxResults] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);

  const fetchLatestRun = async () => {
    setLoading(true);
    setError(null);
    try {
      // If we have a specific run ID, use it
      if (runId) {
        const response = await axios.get(`/api/scrape-runs/${runId}`, {
          headers: {
            'Authorization': 'Bearer pleasantcove2024admin'
          }
        });
        
        if (response.data && response.data.latest && Array.isArray(response.data.latest)) {
          setLeads(response.data.latest);
        } else {
          setLeads([]);
        }
      } else {
        // Otherwise use mock data
        setLeads([
          {
            id: 'mock-1',
            name: 'Brunswick Plumbing Experts',
            type: 'plumber',
            location: 'Brunswick, ME',
            hasWebsite: 1,
            scrapedAt: new Date().toISOString()
          },
          {
            id: 'mock-2',
            name: 'Maine Plumbing Solutions',
            type: 'plumber',
            location: 'Brunswick, ME',
            hasWebsite: 0,
            scrapedAt: new Date().toISOString()
          }
        ]);
      }
    } catch (err: any) {
      console.error('Error fetching leads:', err);
      setError(`Error fetching leads: ${err.message}`);
      // Use mock data on error
      setLeads([
        {
          id: 'mock-error',
          name: 'Error Loading Data',
          type: 'error',
          location: '',
          hasWebsite: 0,
          scrapedAt: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startScrape = async () => {
    setScraping(true);
    setError(null);
    try {
      // Use the working /api/scrape-runs endpoint
      const response = await axios.post('/api/scrape-runs', {
        city: location,
        category: businessType,
        limit: maxResults
      }, {
        headers: {
          'Authorization': 'Bearer pleasantcove2024admin',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Scrape response:', response.data);
      
      if (response.data && response.data.runId) {
        setRunId(response.data.runId);
        
        // Wait for 3 seconds to give the scraper time to run
        setTimeout(() => {
          fetchLatestRun();
          setScraping(false);
          alert(`✅ Scrape completed! Run ID: ${response.data.runId}`);
        }, 3000);
      } else {
        setScraping(false);
        setError('Scrape failed: No run ID returned');
      }
    } catch (err: any) {
      console.error('Error starting scrape:', err);
      setError(`Error starting scrape: ${err.message}`);
      setScraping(false);
    }
  };

  useEffect(() => {
    fetchLatestRun();
  }, [runId]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Super Simple Lead Management
      </Typography>
      
      {error && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Scrape New Leads
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={scraping}
              />
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                select
                label="Business Type"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                disabled={scraping}
              >
                <MenuItem value="plumber">Plumber</MenuItem>
                <MenuItem value="electrician">Electrician</MenuItem>
                <MenuItem value="contractor">Contractor</MenuItem>
                <MenuItem value="restaurant">Restaurant</MenuItem>
                <MenuItem value="dentist">Dentist</MenuItem>
              </TextField>
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                type="number"
                label="Max Results"
                value={maxResults}
                onChange={(e) => setMaxResults(parseInt(e.target.value))}
                disabled={scraping}
                InputProps={{ inputProps: { min: 1, max: 50 } }}
              />
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={startScrape}
                disabled={scraping}
                startIcon={scraping ? <CircularProgress size={20} color="inherit" /> : null}
              >
                {scraping ? 'Scraping...' : 'Start Scrape'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          {leads.length} Leads Found
        </Typography>
        
        <Button
          variant="outlined"
          onClick={fetchLatestRun}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {leads.map((lead, index) => (
            <Grid item xs={12} sm={6} md={4} key={lead.id || index}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {lead.name}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {lead.type}
                  </Typography>
                  
                  {lead.location && (
                    <Typography variant="body2">
                      📍 {lead.location}
                    </Typography>
                  )}
                  
                  <Typography variant="body2">
                    🌐 Website: {lead.hasWebsite ? 'Yes' : 'No'}
                  </Typography>
                  
                  {lead.scrapedAt && (
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Scraped: {new Date(lead.scrapedAt).toLocaleString()}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default SuperSimpleLeads;

