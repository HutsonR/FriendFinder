// ===== PROFILE PAGE STATE =====
let currentProfile = null;
let isLoading = false;
let photosLoaded = false;
let currentProfileId = null;

// ===== UI STATE MANAGEMENT =====

function showProfileLoading() {
    document.getElementById('profileLoadingState').classList.remove('hidden');
    document.getElementById('profileErrorState').classList.add('hidden');
    document.getElementById('profileContent').classList.add('hidden');
}

function hideProfileLoading() {
    document.getElementById('profileLoadingState').classList.add('hidden');
}

function showProfileError(message = 'Profile not found') {
    const errorState = document.getElementById('profileErrorState');
    const errorMessage = document.getElementById('profileErrorMessage');
    errorMessage.textContent = message;
    
    hideProfileLoading();
    errorState.classList.remove('hidden');
    document.getElementById('profileContent').classList.add('hidden');
}

function showProfileContent() {
    hideProfileLoading();
    document.getElementById('profileErrorState').classList.add('hidden');
    document.getElementById('profileContent').classList.remove('hidden');
}

function showGalleryLoading() {
    document.getElementById('galleryLoadingState').classList.remove('hidden');
    document.getElementById('photosGrid').classList.add('hidden');
    document.getElementById('noPhotosState').classList.add('hidden');
}

function hideGalleryLoading() {
    document.getElementById('galleryLoadingState').classList.add('hidden');
}

function showNoPhotos() {
    hideGalleryLoading();
    document.getElementById('photosGrid').classList.add('hidden');
    document.getElementById('noPhotosState').classList.remove('hidden');
}

function showPhotosGrid() {
    hideGalleryLoading();
    document.getElementById('photosGrid').classList.remove('hidden');
    document.getElementById('noPhotosState').classList.add('hidden');
}

// ===== NAVIGATION FUNCTIONS =====

function goBack() {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = 'index.html';
    }
}

// ===== PHOTO MODAL FUNCTIONALITY =====

function openPhotoModal(imgElement) {
    const modal = document.getElementById('photoModal');
    const modalImage = document.getElementById('modalImage');
    
    modalImage.src = imgElement.src;
    modalImage.alt = imgElement.alt;
    modal.classList.add('active');
    
    document.body.style.overflow = 'hidden';
    
    // Track photo view
    if (currentProfile) {
        window.apiService.recordInteraction(currentProfile.id, 'photo_view', {
            photo_url: imgElement.src,
            source: 'profile_page'
        });
    }
}

function closePhotoModal() {
    const modal = document.getElementById('photoModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// ===== SERVER DATA LOADING =====

async function fetchProfileData(profileId) {
    if (isLoading) return;
    
    isLoading = true;
    currentProfileId = profileId;
    
    try {
        showProfileLoading();
        
        // Use smart API call that falls back to mock data
        const profileData = await smartApiCall(
            () => window.apiService.fetchProfile(profileId),
            () => window.apiService.fetchMockProfile(profileId)
        );
        
        // Validate the received data
        validateProfileData(profileData);
        
        currentProfile = profileData;
        
        // Update all UI components
        updateProfileContent(profileData);
        showProfileContent();
        
        // Load photos separately for better UX
        await loadProfilePhotos(profileId);
        
        console.log('Profile loaded successfully:', profileData.name);
        
    } catch (error) {
        console.error('Failed to load profile:', error);
        
        let errorMessage = 'Failed to load profile';
        if (error instanceof ApiError) {
            if (error.status === 404) {
                errorMessage = 'This profile no longer exists';
            } else if (error.status === 403) {
                errorMessage = 'You don\'t have access to this profile';
            } else if (error.isNetworkError()) {
                errorMessage = 'Network connection issue. Please check your internet.';
            }
        }
        
        showProfileError(errorMessage);
    } finally {
        isLoading = false;
    }
}

async function loadProfilePhotos(profileId) {
    if (photosLoaded) return;
    
    try {
        showGalleryLoading();
        
        // In real implementation, this would fetch additional photos
        // For now, photos are included in the main profile response
        photosLoaded = true;
        
        if (currentProfile && currentProfile.photos && currentProfile.photos.length > 0) {
            renderPhotoGallery(currentProfile.photos);
            showPhotosGrid();
        } else {
            showNoPhotos();
        }
        
    } catch (error) {
        console.warn('Failed to load additional photos:', error);
        hideGalleryLoading();
        showNoPhotos();
    }
}

function retryLoadProfile() {
    if (currentProfileId) {
        photosLoaded = false;
        fetchProfileData(currentProfileId);
    }
}

// ===== CONTENT RENDERING =====

function updateProfileContent(profileData) {
    try {
        updateHeroSection(profileData);
        updateInfoSection(profileData);
        updateTelegramButtons(profileData);
        updatePageMetadata(profileData);
        
    } catch (error) {
        console.error('Error updating profile content:', error);
        throw new Error('Failed to display profile information');
    }
}

function updateHeroSection(profileData) {
    const heroImage = document.getElementById('heroImage');
    const heroName = document.getElementById('heroName');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    
    if (heroImage) {
        heroImage.src = profileData.heroImage;
        heroImage.alt = `${profileData.name}'s main photo`;
    }
    
    if (heroName) {
        heroName.textContent = profileData.name;
    }
    
    // Update online status
    if (statusIndicator && statusText) {
        statusIndicator.classList.remove('hidden');
        if (profileData.isOnline) {
            statusText.textContent = 'Online';
            statusIndicator.classList.add('online');
            statusIndicator.classList.remove('offline');
        } else {
            statusText.textContent = formatLastSeen(profileData.lastSeen);
            statusIndicator.classList.add('offline');
            statusIndicator.classList.remove('online');
        }
    }
}

function updateInfoSection(profileData) {
    const ageValue = document.getElementById('ageValue');
    const locationDisplay = document.getElementById('locationDisplay');
    const locationText = document.getElementById('locationText');
    const descriptionSkeleton = document.getElementById('descriptionSkeleton');
    const descriptionText = document.getElementById('descriptionText');
    
    if (ageValue) {
        ageValue.textContent = profileData.age;
    }
    
    // Update location if available
    if (profileData.location && locationDisplay && locationText) {
        locationText.textContent = profileData.location;
        locationDisplay.classList.remove('hidden');
    }
    
    // Update description
    if (descriptionSkeleton && descriptionText) {
        descriptionSkeleton.classList.add('hidden');
        descriptionText.textContent = profileData.description;
        descriptionText.classList.remove('hidden');
    }
}

function updateTelegramButtons(profileData) {
    const telegramButton = document.getElementById('telegramButton');
    const bottomTelegramButton = document.getElementById('bottomTelegramButton');
    
    const telegramUrl = profileData.telegramUsername ? `https://t.me/${profileData.telegramUsername}` : null;
    
    [telegramButton, bottomTelegramButton].forEach(button => {
        if (button) {
            if (telegramUrl) {
                button.disabled = false;
                button.onclick = () => handleTelegramClick(profileData.id, profileData.telegramUsername);
            } else {
                button.disabled = true;
                button.style.opacity = '0.5';
            }
        }
    });
}

function renderPhotoGallery(photos) {
    const photosGrid = document.getElementById('photosGrid');
    const galleryTitle = document.getElementById('galleryTitle');
    
    if (!photosGrid) return;
    
    photosGrid.innerHTML = '';
    
    if (galleryTitle) {
        galleryTitle.textContent = `Photo Gallery (${photos.length})`;
    }
    
    photos.forEach((photo, index) => {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        photoItem.style.animationDelay = `${0.1 + (index * 0.1)}s`;
        
        const img = document.createElement('img');
        img.src = photo.url;
        img.alt = photo.caption || `Photo ${index + 1}`;
        img.onclick = () => openPhotoModal(img);
        img.onerror = () => handlePhotoError(photoItem, index);
        
        photoItem.appendChild(img);
        photosGrid.appendChild(photoItem);
    });
}

// ===== ERROR HANDLERS =====

function handleHeroImageError(imgElement) {
    console.warn('Failed to load hero image');
    imgElement.src = 'https://via.placeholder.com/400x600/1a0d2e/ffffff?text=Profile+Photo+Not+Available';
    imgElement.alt = 'Profile photo not available';
}

function handlePhotoError(photoItem, index) {
    console.warn(`Failed to load photo ${index + 1}`);
    photoItem.style.display = 'none';
}

// ===== INTERACTION HANDLERS =====

function handleTelegramClick(profileId, telegramUsername) {
    if (!telegramUsername) {
        console.warn('No Telegram username available');
        return;
    }
    
    // Record interaction
    window.apiService.recordInteraction(profileId, 'telegram_click', {
        source: 'profile_page',
        timestamp: new Date().toISOString()
    });
    
    const telegramUrl = `https://t.me/${telegramUsername}`;
    window.open(telegramUrl, '_blank');
}

// ===== UTILITY FUNCTIONS =====

function formatLastSeen(lastSeenDate) {
    if (!lastSeenDate) return 'Last seen recently';
    
    const date = new Date(lastSeenDate);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) {
        return 'Last seen recently';
    } else if (diffHours < 24) {
        return `Last seen ${diffHours}h ago`;
    } else if (diffDays < 7) {
        return `Last seen ${diffDays}d ago`;
    } else {
        return 'Last seen a while ago';
    }
}

function updatePageMetadata(profileData) {
    document.title = `${profileData.name}'s Profile - Friend Finder`;
    
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = 'description';
        document.head.appendChild(metaDescription);
    }
    
    const locationStr = profileData.location ? ` from ${profileData.location}` : '';
    const descriptionPreview = profileData.description.length > 150 
        ? profileData.description.substring(0, 150) + '...' 
        : profileData.description;
    
    metaDescription.content = `Meet ${profileData.name}, ${profileData.age} years old${locationStr}. ${descriptionPreview}`;
}

function validateProfileData(data) {
    const required = ['id', 'name', 'age'];
    const missing = required.filter(field => !data[field]);
    
    if (missing.length > 0) {
        throw new ApiError(`Missing required profile fields: ${missing.join(', ')}`, 422);
    }
    
    if (typeof data.age !== 'number' || data.age < 18 || data.age > 100) {
        throw new ApiError('Invalid age value', 422);
    }
    
    if (data.photos && !Array.isArray(data.photos)) {
        throw new ApiError('Photos must be an array', 422);
    }
    
    return true;
}

// ===== INITIALIZATION =====

document.addEventListener('DOMContentLoaded', function() {
    console.log('Profile page initializing...');
    
    const urlParams = new URLSearchParams(window.location.search);
    const profileId = urlParams.get('id');
    
    if (!profileId) {
        showProfileError('No profile ID specified in the URL');
        return;
    }
    
    // Initialize page
    initializeProfilePage();
    
    // Load profile data
    fetchProfileData(profileId);
});

function initializeProfilePage() {
    // Set up keyboard navigation
    document.addEventListener('keydown', handleKeyboardNavigation);
    
    // Set up modal click handling
    const modalContent = document.querySelector('.modal-content');
    if (modalContent) {
        modalContent.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    
    // Add haptic feedback
    const interactiveElements = document.querySelectorAll('.back-button, .telegram-flirt-button, .photo-item, .retry-button');
    interactiveElements.forEach(addHapticFeedback);
}

function handleKeyboardNavigation(e) {
    if (e.key === 'Escape') {
        closePhotoModal();
    }
}

function addHapticFeedback(element) {
    element.addEventListener('click', function() {
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
    });
}

