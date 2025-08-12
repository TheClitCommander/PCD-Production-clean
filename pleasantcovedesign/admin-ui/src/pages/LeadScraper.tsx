import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Loader2, Search, Download, RefreshCw, Target, Phone, Globe, Star, X, Plus, MapPin } from 'lucide-react';
import { api } from '../lib/api';

interface ScrapingJob {
  id: string;
  businessType: string;
  location: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt: string;
  completedAt?: string;
  totalFound: number;
  primeProspects: number;
  errorMessage?: string;
}

interface ScrapingStats {
  totalBusinesses: number;
  businessesByType: Record<string, number>;
  primeProspects: number;
  averageRating: number;
  lastScrapedAt: string;
}

interface ScrapedBusiness {
  id: number;
  business_name: string;
  business_type: string;
  address: string;
  location: string;
  phone: string;
  website: string;
  has_website: boolean;
  rating: number;
  reviews: string;
  maps_url: string;
  scraped_at: string;
}

export function LeadScraper() {
  const [stats, setStats] = useState<ScrapingStats | null>(null);
  const [jobs, setJobs] = useState<ScrapingJob[]>([]);
  const [businesses, setBusinesses] = useState<ScrapedBusiness[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [businessType, setBusinessType] = useState('plumbers');
  const [location, setLocation] = useState('');
  const [locations, setLocations] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState('');
  
  // State for viewing full business list
  const [showFullList, setShowFullList] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterText, setFilterText] = useState('');
  const itemsPerPage = 20;

  useEffect(() => {
    loadData();
    // Load some default Maine locations
    setLocations([
      'Brunswick, ME',
      'Bath, ME', 
      'Topsham, ME',
      'Freeport, ME',
      'Wiscasset, ME',
      'Damariscotta, ME',
      'Rockland, ME',
      'Camden, ME'
    ]);
  }, []);

  const addLocation = () => {
    if (locationInput.trim() && !locations.includes(locationInput.trim())) {
      setLocations([...locations, locationInput.trim()]);
      setLocationInput('');
    }
  };

  const removeLocation = (locationToRemove: string) => {
    setLocations(locations.filter(loc => loc !== locationToRemove));
  };

  const addPresetLocation = (preset: string) => {
    if (!locations.includes(preset)) {
      setLocations([...locations, preset]);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load stats, jobs, and results in parallel using authenticated API
      const [statsRes, jobsRes, resultsRes] = await Promise.all([
        api.get('/scraper/stats'),
        api.get('/scraper/jobs'),
        api.get('/scraper/results')
      ]);

      setStats(statsRes.data);
      setJobs(jobsRes.data);
      setBusinesses(resultsRes.data.businesses || []);

    } catch (err) {
      console.error('Error loading scraper data:', err);
      setError('Failed to load scraper data');
    } finally {
      setLoading(false);
    }
  };

  const startScraping = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      if (locations.length === 0) {
        setError('Please add at least one location to scrape');
        return;
      }

      // Start scraping jobs for each location using authenticated API
      const jobPromises = locations.map(async (loc) => {
        const response = await api.post('/scraper/start', {
          businessType,
          location: loc
        });
        return response.data;
      });

      const results = await Promise.all(jobPromises);
      const jobIds = results.map(r => r.jobId);
      
      setSuccess(`Started ${jobIds.length} scraping jobs for ${locations.length} locations!`);
      
      // Reload data to show new jobs
      setTimeout(loadData, 1000);

    } catch (err) {
      console.error('Error starting scraping:', err);
      setError(err instanceof Error ? err.message : 'Failed to start scraping');
    } finally {
      setLoading(false);
    }
  };

  const exportLeads = async () => {
    try {
      setExporting(true);
      setError(null);
      setSuccess(null);

      const response = await api.post('/scraper/export', {
        format: 'excel'
      });

      setSuccess(`Export completed! File: ${response.data.filename}`);

    } catch (err) {
      console.error('Error exporting leads:', err);
      setError(err instanceof Error ? err.message : 'Failed to export leads');
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (status: ScrapingJob['status']) => {
    const variants = {
      pending: 'secondary',
      running: 'default',
      completed: 'success',
      failed: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Filter and pagination for business list
  const filteredBusinesses = businesses.filter(business => 
    business.business_name.toLowerCase().includes(filterText.toLowerCase()) ||
    business.address.toLowerCase().includes(filterText.toLowerCase()) ||
    business.business_type.toLowerCase().includes(filterText.toLowerCase()) ||
    (business.phone && business.phone.includes(filterText))
  );

  const totalPages = Math.ceil(filteredBusinesses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBusinesses = filteredBusinesses.slice(startIndex, startIndex + itemsPerPage);

  const primeProspects = filteredBusinesses.filter(b => !b.has_website && b.phone);
  const businessesWithWebsites = filteredBusinesses.filter(b => b.has_website);
  const businessesWithoutPhone = filteredBusinesses.filter(b => !b.phone);

  const getPrimeProspects = () => {
    return businesses.filter(b => !b.has_website && b.phone);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lead Scraper</h1>
          <p className="text-muted-foreground">
            Find and scrape business leads from your target market
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Businesses</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBusinesses}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prime Prospects</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.primeProspects}</div>
              <p className="text-xs text-muted-foreground">No website + phone</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">stars</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Scraped</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold">
                {stats.lastScrapedAt === 'Never' ? 'Never' : formatDate(stats.lastScrapedAt)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Start New Scraping Job */}
        <Card>
          <CardHeader>
            <CardTitle>Start New Scraping Job</CardTitle>
            <CardDescription>
              Search for businesses across multiple locations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type</Label>
              <Select value={businessType} onValueChange={setBusinessType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plumbers">Plumbers</SelectItem>
                  <SelectItem value="hvac">HVAC Contractors</SelectItem>
                  <SelectItem value="electricians">Electricians</SelectItem>
                  <SelectItem value="roofers">Roofers</SelectItem>
                  <SelectItem value="contractors">General Contractors</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Target Locations ({locations.length})</Label>
              
              {/* Add New Location */}
              <div className="flex gap-2">
                <Input
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="Add location (e.g., Portland, ME)"
                  onKeyPress={(e) => e.key === 'Enter' && addLocation()}
                />
                <Button 
                  type="button" 
                  onClick={addLocation}
                  size="sm"
                  disabled={!locationInput.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Quick Add Presets */}
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">Quick add:</span>
                {['Portland, ME', 'Lewiston, ME', 'Bangor, ME', 'Augusta, ME', 'Biddeford, ME'].map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addPresetLocation(preset)}
                    disabled={locations.includes(preset)}
                  >
                    {preset}
                  </Button>
                ))}
              </div>

              {/* Current Locations */}
              {locations.length > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {locations.map((loc) => (
                      <Badge key={loc} variant="secondary" className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {loc}
                        <button
                          onClick={() => removeLocation(loc)}
                          className="ml-1 hover:bg-red-100 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button 
              onClick={startScraping} 
              disabled={loading || !businessType || locations.length === 0}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Start Scraping {locations.length} Location{locations.length !== 1 ? 's' : ''}
            </Button>
          </CardContent>
        </Card>

        {/* Export Results */}
        <Card>
          <CardHeader>
            <CardTitle>Export Results</CardTitle>
            <CardDescription>
              Download your scraped leads as Excel file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>Total businesses: {businesses.length}</p>
              <p>Prime prospects: {getPrimeProspects().length}</p>
            </div>

            <Button 
              onClick={exportLeads} 
              disabled={exporting || businesses.length === 0}
              className="w-full"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export to Excel
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Scraping Jobs</CardTitle>
          <CardDescription>
            Track the progress of your scraping jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No scraping jobs yet. Start your first job above!
            </p>
          ) : (
            <div className="space-y-4">
              {jobs.slice(0, 5).map((job) => (
                <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{job.businessType}</span>
                      <span className="text-muted-foreground">in {job.location}</span>
                      {getStatusBadge(job.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Started: {formatDate(job.startedAt)}
                      {job.completedAt && (
                        <span> • Completed: {formatDate(job.completedAt)}</span>
                      )}
                    </div>
                    {job.status === 'running' && (
                      <Progress value={job.progress} className="w-full mt-2" />
                    )}
                    {job.errorMessage && (
                      <p className="text-sm text-red-600">{job.errorMessage}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{job.totalFound}</div>
                    <div className="text-sm text-muted-foreground">found</div>
                    {job.primeProspects > 0 && (
                      <div className="text-sm text-green-600">{job.primeProspects} prime</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* No Results Message */}
      {businesses.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🚫 Scraping Temporarily Disabled</CardTitle>
            <CardDescription>
              Fake data generation has been disabled to ensure data quality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                <strong>✅ Fake data generation REMOVED</strong><br/>
                • All hardcoded fake businesses (like "Five Star Plumbing") have been eliminated<br/>
                • Scraper now only returns real, verified businesses from Google Places API<br/>
                • Database is clean - no fake data will be generated<br/>
                • Ready for real lead generation when API key is added
              </AlertDescription>
            </Alert>
            
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2">Next Steps for Real Data:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Get Google Places API key from Google Cloud Console</li>
                <li>Set environment variable: GOOGLE_PLACES_API_KEY</li>
                <li>Use google_maps_api_scraper.py for verified businesses</li>
                <li>Manually verify businesses exist before outreach</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Results Preview */}
      {businesses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Results</CardTitle>
            <CardDescription>
              Preview of your latest scraped businesses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {businesses.slice(0, 10).map((business) => (
                <div key={business.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{business.business_name}</span>
                      {!business.has_website && (
                        <Badge variant="secondary">No Website</Badge>
                      )}
                      {business.phone && (
                        <Badge variant="outline">Has Phone</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {business.address} • {business.business_type}
                    </div>
                    {business.phone && (
                      <div className="text-sm text-blue-600">{business.phone}</div>
                    )}
                  </div>
                  <div className="text-right">
                    {business.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">{business.rating}</span>
                        {business.reviews && (
                          <span className="text-sm text-muted-foreground">({business.reviews})</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Business List */}
      {businesses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>All Scraped Businesses ({filteredBusinesses.length})</span>
              <Button
                variant="outline"
                onClick={() => setShowFullList(!showFullList)}
              >
                {showFullList ? 'Hide' : 'View All'}
              </Button>
            </CardTitle>
            <CardDescription>
              Complete list of all scraped businesses with filtering and search
            </CardDescription>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{primeProspects.length}</div>
                <div className="text-sm text-green-700">Prime Prospects</div>
                <div className="text-xs text-muted-foreground">No website + Phone</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{businessesWithWebsites.length}</div>
                <div className="text-sm text-blue-700">Have Websites</div>
                <div className="text-xs text-muted-foreground">Already established</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{businessesWithoutPhone.length}</div>
                <div className="text-sm text-orange-700">No Phone Listed</div>
                <div className="text-xs text-muted-foreground">Harder to contact</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{filteredBusinesses.length}</div>
                <div className="text-sm text-gray-700">Total Filtered</div>
                <div className="text-xs text-muted-foreground">Matching search</div>
              </div>
            </div>
          </CardHeader>

          {showFullList && (
            <CardContent>
              {/* Search and Filter */}
              <div className="mb-6 space-y-4">
                <div className="flex gap-4 items-center">
                  <div className="flex-1">
                    <Label htmlFor="filter">Search businesses</Label>
                    <Input
                      id="filter"
                      placeholder="Search by name, address, type, or phone..."
                      value={filterText}
                      onChange={(e) => {
                        setFilterText(e.target.value);
                        setCurrentPage(1); // Reset to first page when filtering
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={filterText === '' ? 'default' : 'outline'}
                      onClick={() => setFilterText('')}
                    >
                      All
                    </Button>
                    <Button
                      variant={filterText === 'no website' ? 'default' : 'outline'}
                      onClick={() => setFilterText('no website')}
                    >
                      Prime Prospects
                    </Button>
                  </div>
                </div>
              </div>

              {/* Business List */}
              <div className="space-y-3">
                {paginatedBusinesses.map((business) => (
                  <div key={business.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-lg">{business.business_name}</span>
                        <div className="flex gap-2">
                          {!business.has_website && (
                            <Badge variant="default" className="bg-green-600">
                              <Target className="h-3 w-3 mr-1" />
                              Prime Prospect
                            </Badge>
                          )}
                          {business.has_website && (
                            <Badge variant="outline">
                              <Globe className="h-3 w-3 mr-1" />
                              Has Website
                            </Badge>
                          )}
                          {business.phone && (
                            <Badge variant="outline">
                              <Phone className="h-3 w-3 mr-1" />
                              Phone Available
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Address:</span> {business.address}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Type:</span> {business.business_type}
                        </div>
                        {business.phone && (
                          <div>
                            <span className="text-muted-foreground">Phone:</span> 
                            <span className="text-blue-600 font-medium ml-1">{business.phone}</span>
                          </div>
                        )}
                        {business.website && (
                          <div>
                            <span className="text-muted-foreground">Website:</span>
                            <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                              {business.website}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right space-y-1">
                      {business.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium">{business.rating}</span>
                          {business.reviews && (
                            <span className="text-sm text-muted-foreground">({business.reviews})</span>
                          )}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Scraped: {formatDate(business.scraped_at)}
                      </div>
                      {business.maps_url && (
                        <a 
                          href={business.maps_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View on Maps
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages} ({filteredBusinesses.length} total)
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
