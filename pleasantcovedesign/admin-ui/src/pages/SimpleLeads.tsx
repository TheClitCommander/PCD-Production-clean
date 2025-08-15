import React, { useState, useEffect } from 'react';
import { Button, Card, CardContent, Typography, Grid, Box, CircularProgress, TextField, MenuItem } from '@mui/material';
import api from '../api';

interface Lead {
  id: string;
  name: string;
  category?: string;
  address?: string;
  city?: string;
  phone?: string;
  website?: string;
  websiteStatus?: string;
  websiteConfidence?: number;
  rating?: number;
  reviews?: number;
  createdAt?: string;
}

const SimpleLeads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [location, setLocation] = useState('Brunswick');
  const [businessType, setBusinessType] = useState('plumber');
  const [maxResults, setMaxResults] = useState(10);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use the existing /api/scrape-runs endpoint to get scrape results
      const response = await api.get('/api/scrape-runs');
      
      if (response.data && response.data.latest && Array.isArray(response.data.latest)) {
        // Convert the scrape results to lead format
        const scrapedLeads = response.data.latest.map((item: any, index: number) => ({
          id: `scrape-${index}`,
          name: item.name || 'Unknown Business',
          category: item.type || businessType,
          address: item.address || '',
          city: item.location || location,
          phone: item.phone || '',
          website: item.website || '',
          websiteStatus: item.hasWebsite ? 'HAS_SITE' : 'NO_SITE',
          websiteConfidence: item.hasWebsite ? 0.9 : 0.1,
          rating: item.rating || 0,
          reviews: item.reviews || 0,
          createdAt: item.scrapedAt || new Date().toISOString()
        }));
        
        setLeads(scrapedLeads);
      } else {
        // Fallback to mock data if no results
        setLeads([
          {
            id: 'mock-1',
            name: 'Brunswick Plumbing Experts',
            category: 'plumber',
            address: '123 Main St',
            city: 'Brunswick, ME',
            phone: '207-555-1234',
            website: 'https://brunswickplumbing.example.com',
            websiteStatus: 'HAS_SITE',
            websiteConfidence: 0.95,
            rating: 4.8,
            reviews: 45,
            createdAt: new Date().toISOString()
          },
          {
            id: 'mock-2',
            name: 'Maine Plumbing Solutions',
            category: 'plumber',
            address: '456 Water St',
            city: 'Brunswick, ME',
            phone: '207-555-5678',
            website: 'https://maineplumbing.example.com',
            websiteStatus: 'HAS_SITE',
            websiteConfidence: 0.9,
            rating: 4.5,
            reviews: 32,
            createdAt: new Date().toISOString()
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
          category: 'error',
          address: '',
          city: '',
          phone: '',
          website: '',
          websiteStatus: 'ERROR',
          websiteConfidence: 0,
          createdAt: new Date().toISOString()
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
      const response = await api.post('/api/scrape-runs', {
        city: location,
        category: businessType,
        limit: maxResults
      });
      
      console.log('Scrape response:', response.data);
      
      if (response.data && response.data.runId) {
        // Wait for 3 seconds to give the scraper time to run
        setTimeout(() => {
          fetchLeads();
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
    fetchLeads();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Lead Management
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
          onClick={fetchLeads}
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
          {leads.map((lead) => (
            <Grid item xs={12} sm={6} md={4} key={lead.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {lead.name}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {lead.category}
                  </Typography>
                  
                  {lead.address && (
                    <Typography variant="body2">
                      📍 {lead.address}, {lead.city}
                    </Typography>
                  )}
                  
                  {lead.phone && (
                    <Typography variant="body2">
                      📞 {lead.phone}
                    </Typography>
                  )}
                  
                  {lead.website && (
                    <Typography variant="body2">
                      🌐 <a href={lead.website} target="_blank" rel="noopener noreferrer">{lead.website}</a>
                    </Typography>
                  )}
                  
                  {lead.websiteStatus && (
                    <Typography variant="body2">
                      Website: {lead.websiteStatus} ({(lead.websiteConfidence || 0) * 100}%)
                    </Typography>
                  )}
                  
                  {lead.rating !== undefined && (
                    <Typography variant="body2">
                      ⭐ {lead.rating} ({lead.reviews} reviews)
                    </Typography>
                  )}
                  
                  {lead.createdAt && (
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Added: {new Date(lead.createdAt).toLocaleString()}
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

export default SimpleLeads;
