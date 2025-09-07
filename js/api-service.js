// ===== API SERVICE MODULE =====
// Centralized service for all server communication

class ApiService {
    constructor() {
        this.baseURL = this.getBaseURL();
        this.timeout = 100;
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
    }

    // Get base URL from environment or default
    getBaseURL() {
        // In production, this could come from environment variables
        // For now, using a configurable endpoint
        return window.API_BASE_URL || 'https://api.friendfinder.com';
    }

    // ===== CORE REQUEST METHODS =====

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...this.getAuthHeaders()
            },
            signal: controller.signal
        };

        const finalOptions = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, finalOptions);
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status, response);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new ApiError('Request timeout', 408);
            }
            
            if (error instanceof ApiError) {
                throw error;
            }
            
            throw new ApiError(`Network error: ${error.message}`, 0, null, error);
        }
    }

    // Request with retry logic
    async requestWithRetry(endpoint, options = {}, attempts = this.retryAttempts) {
        try {
            return await this.request(endpoint, options);
        } catch (error) {
            if (attempts > 1 && this.shouldRetry(error)) {
                console.warn(`Request failed, retrying... (${this.retryAttempts - attempts + 1}/${this.retryAttempts})`);
                await this.delay(this.retryDelay);
                return this.requestWithRetry(endpoint, options, attempts - 1);
            }
            throw error;
        }
    }

    // ===== PROFILE ENDPOINTS =====

    async fetchProfiles(params = {}) {
        const queryString = this.buildQueryString(params);
        const endpoint = `/api/profiles${queryString}`;
        
        try {
            const response = await this.requestWithRetry(endpoint);
            return this.transformProfilesResponse(response);
        } catch (error) {
            console.error('Failed to fetch profiles:', error);
            throw error;
        }
    }

    async fetchProfile(profileId) {
        if (!profileId) {
            throw new ApiError('Profile ID is required', 400);
        }

        const endpoint = `/api/profiles/${encodeURIComponent(profileId)}`;
        
        try {
            const response = await this.requestWithRetry(endpoint);
            return this.transformProfileResponse(response);
        } catch (error) {
            console.error(`Failed to fetch profile ${profileId}:`, error);
            throw error;
        }
    }

    async fetchProfilePhotos(profileId) {
        if (!profileId) {
            throw new ApiError('Profile ID is required', 400);
        }

        const endpoint = `/api/profiles/${encodeURIComponent(profileId)}/photos`;
        
        try {
            const response = await this.requestWithRetry(endpoint);
            return this.transformPhotosResponse(response);
        } catch (error) {
            console.error(`Failed to fetch photos for profile ${profileId}:`, error);
            throw error;
        }
    }

    // ===== INTERACTION ENDPOINTS =====

    async recordInteraction(profileId, interactionType, metadata = {}) {
        const endpoint = '/api/interactions';
        const data = {
            profile_id: profileId,
            interaction_type: interactionType,
            timestamp: new Date().toISOString(),
            metadata
        };

        try {
            return await this.request(endpoint, {
                method: 'POST',
                body: JSON.stringify(data)
            });
        } catch (error) {
            console.error('Failed to record interaction:', error);
            // Don't throw for analytics failures
            return null;
        }
    }

    // ===== DATA TRANSFORMATION =====

    transformProfilesResponse(response) {
        // Ensure response has expected structure
        if (!response || !Array.isArray(response.profiles)) {
            throw new ApiError('Invalid profiles response format', 422);
        }

        return {
            profiles: response.profiles.map(profile => this.normalizeProfile(profile)),
            total: response.total || response.profiles.length,
            page: response.page || 1,
            hasMore: response.has_more || false
        };
    }

    transformProfileResponse(response) {
        if (!response || !response.profile) {
            throw new ApiError('Invalid profile response format', 422);
        }

        return this.normalizeProfile(response.profile);
    }

    transformPhotosResponse(response) {
        if (!response || !Array.isArray(response.photos)) {
            throw new ApiError('Invalid photos response format', 422);
        }

        return response.photos.map(photo => ({
            id: photo.id,
            url: photo.url,
            caption: photo.caption || '',
            isMain: photo.is_main || false,
            order: photo.order || 0
        }));
    }

    // Normalize profile data structure
    normalizeProfile(profile) {
        return {
            id: profile.id,
            name: profile.name,
            age: profile.age,
            location: profile.location || '',
            country: profile.country || '',
            countryFlag: profile.country_flag || '',
            description: profile.description || '',
            heroImage: profile.hero_image || profile.main_photo?.url || '',
            photos: (profile.photos || []).map(photo => ({
                id: photo.id,
                url: photo.url,
                caption: photo.caption || '',
                isMain: photo.is_main || false
            })),
            telegramUsername: profile.telegram_username || profile.telegram || '',
            isOnline: profile.is_online || false,
            lastSeen: profile.last_seen ? new Date(profile.last_seen) : null,
            tags: profile.tags || [],
            preferences: profile.preferences || {}
        };
    }

    // ===== UTILITY METHODS =====

    getAuthHeaders() {
        // Add authentication headers if needed
        const token = localStorage.getItem('auth_token');
        if (token) {
            return { 'Authorization': `Bearer ${token}` };
        }
        return {};
    }

    buildQueryString(params) {
        const filtered = Object.entries(params)
            .filter(([key, value]) => value !== null && value !== undefined && value !== '')
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        
        return filtered.length > 0 ? `?${filtered.join('&')}` : '';
    }

    shouldRetry(error) {
        // Retry on network errors and 5xx server errors
        return error.status === 0 || (error.status >= 500 && error.status < 600);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ===== MOCK DATA FOR DEVELOPMENT =====

    async fetchMockProfiles() {
        await this.simulateNetworkDelay();
        
        return {
            profiles: [
                {
                    id: 'anna',
                    name: 'Anna',
                    age: 24,
                    location: 'Berlin',
                    country: 'Germany',
                    countryFlag: '🇩🇪',
                    description: 'UX-дизайнер. Люблю путешествия, кофе и длинные разговоры у моря. Ищу компанию на уикенд-квест по городу.',
                    heroImage: 'https://www.fonstola.ru/images/201903/fonstola.ru_322073.jpg',
                    photos: [
                        { id: 1, url: 'https://www.fonstola.ru/images/201903/fonstola.ru_322073.jpg', isMain: true },
                        { id: 2, url: 'https://avatars.mds.yandex.net/i?id=05ea85baf41384f0e3dc04526e5aa2b3_l-5141403-images-thumbs&n=13' },
                        { id: 3, url: 'https://s00.yaplakal.com/pics/pics_original/0/7/2/16458270.jpg' }
                    ],
                    telegramUsername: 'anna',
                    isOnline: true
                },
                {
                    id: 'maria',
                    name: 'Maria',
                    age: 22,
                    location: 'Barcelona',
                    country: 'Spain',
                    countryFlag: '🇪🇸',
                    description: 'Фотограф и художница. Увлекаюсь современным искусством и винтажными камерами. Ищу единомышленников для творческих проектов.',
                    heroImage: 'https://avatars.mds.yandex.net/get-shedevrum/9283310/38640a5fb2ce11ee907ebaaee90618f0/orig',
                    photos: [
                        { id: 1, url: 'https://avatars.mds.yandex.net/get-shedevrum/9283310/38640a5fb2ce11ee907ebaaee90618f0/orig', isMain: true }
                    ],
                    telegramUsername: 'maria',
                    isOnline: false,
                    lastSeen: new Date('2024-01-15T10:30:00Z')
                },
                {
                    id: 'elena',
                    name: 'Elena',
                    age: 26,
                    location: 'Prague',
                    country: 'Czech Republic',
                    countryFlag: '🇨🇿',
                    description: 'Танцовщица и хореограф. Живу музыкой и движением. Ищу партнера для танцев и жизни.',
                    heroImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
                    photos: [
                        { id: 1, url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', isMain: true },
                        { id: 2, url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400' }
                    ],
                    telegramUsername: 'elena_dance',
                    isOnline: true
                }
            ],
            total: 3,
            page: 1,
            hasMore: false
        };
    }

    async fetchMockProfile(profileId) {
        await this.simulateNetworkDelay();
        
        const profiles = await this.fetchMockProfiles();
        const profile = profiles.profiles.find(p => p.id === profileId);
        
        if (!profile) {
            throw new ApiError(`Profile '${profileId}' not found`, 404);
        }
        
        return profile;
    }

    simulateNetworkDelay(min = 300, max = 1200) {
        return new Promise(resolve => {
            const delay = Math.random() * (max - min) + min;
            setTimeout(resolve, delay);
        });
    }
}

// Custom error class for API errors
class ApiError extends Error {
    constructor(message, status = 0, response = null, originalError = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.response = response;
        this.originalError = originalError;
    }

    isNetworkError() {
        return this.status === 0;
    }

    isClientError() {
        return this.status >= 400 && this.status < 500;
    }

    isServerError() {
        return this.status >= 500 && this.status < 600;
    }
}

// ===== GLOBAL API INSTANCE =====
window.apiService = new ApiService();

// ===== UTILITY FUNCTIONS =====

// Check if we're in development mode
function isDevelopmentMode() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.protocol === 'file:';
}

// Smart API call that uses mock data in development
async function smartApiCall(realApiCall, mockApiCall) {
    if (isDevelopmentMode()) {
        console.log('[DEV MODE] Using mock data');
        return await mockApiCall();
    } else {
        try {
            return await realApiCall();
        } catch (error) {
            console.warn('[FALLBACK] API failed, using mock data:', error.message);
            return await mockApiCall();
        }
    }
}

// Export for use in other modules
window.ApiService = ApiService;
window.ApiError = ApiError;
window.smartApiCall = smartApiCall;
