// ===== MAIN PAGE STATE =====
let currentProfilesData = null;
let currentPage = 1;
let isLoading = false;
let hasMoreProfiles = true;

// ===== GALLERY STATE ===== 
const animatingCards = new Set(); // Track which cards are currently animating
const ANIMATION_DURATION = 200;
const MAX_IMAGES_PER_CARD = 10; // Maximum allowed images per card

// Инициализация Telegram Web App
const tg = window.Telegram?.WebApp;

if (tg) {
    // Разрешаем fullscreen
    tg.expand();
    
    // Устанавливаем отступ сверху под безопасную зону
    const safeTop = tg.viewportStableInsetTop || 0;
    const appRoot = document.getElementById('app-root');
    if (appRoot) {
        appRoot.style.paddingTop = `${safeTop}px`;
    }
    
    // Опционально подстраиваем высоту контента под viewport
    const setAppHeight = () => {
        appRoot.style.height = `${tg.viewportHeight}px`;
    };
    
    setAppHeight();
    tg.onEvent('resize', setAppHeight);
}


// ===== UI STATE MANAGEMENT =====

function showMainLoading() {
    document.getElementById('mainLoadingState').classList.remove('hidden');
    document.getElementById('mainErrorState').classList.add('hidden');
    document.getElementById('mainEmptyState').classList.add('hidden');
    document.getElementById('profilesContainer').classList.add('hidden');
}

function hideMainLoading() {
    document.getElementById('mainLoadingState').classList.add('hidden');
}

function showMainError(message = 'We couldn\'t load profiles right now.') {
    const errorState = document.getElementById('mainErrorState');
    const errorMessage = errorState.querySelector('.error-message');
    errorMessage.textContent = message;
    
    hideMainLoading();
    errorState.classList.remove('hidden');
    document.getElementById('mainEmptyState').classList.add('hidden');
    document.getElementById('profilesContainer').classList.add('hidden');
}

function showMainEmpty() {
    hideMainLoading();
    document.getElementById('mainErrorState').classList.add('hidden');
    document.getElementById('mainEmptyState').classList.remove('hidden');
    document.getElementById('profilesContainer').classList.add('hidden');
}

function showMainContent() {
    hideMainLoading();
    document.getElementById('mainErrorState').classList.add('hidden');
    document.getElementById('mainEmptyState').classList.add('hidden');
    document.getElementById('profilesContainer').classList.remove('hidden');
}

function updateLoadMoreButton(hasMore, isLoading = false) {
    const container = document.getElementById('loadMoreContainer');
    const button = document.getElementById('loadMoreButton');
    const text = button.querySelector('.load-more-text');
    const spinner = button.querySelector('.load-more-spinner');
    
    if (hasMore) {
        container.classList.remove('hidden');
        button.disabled = isLoading;
        
        if (isLoading) {
            text.textContent = 'Loading...';
            spinner.classList.remove('hidden');
        } else {
            text.textContent = 'Show more people';
            spinner.classList.add('hidden');
        }
    } else {
        container.classList.add('hidden');
    }
}

// ===== DYNAMIC CONTENT GENERATION =====

function createPhotoCard(profile) {
    const card = document.createElement('article');
    card.className = 'photo-card';
    card.setAttribute('data-card-id', profile.id);
    card.setAttribute('data-profile-name', profile.name);
    
    // Ensure we have at least one photo
    const photos = profile.photos && profile.photos.length > 0 ? profile.photos : [{
        id: 'placeholder',
        url: profile.heroImage || 'https://via.placeholder.com/300x400/1a0d2e/ffffff?text=No+Photo',
        caption: 'Main photo'
    }];
    
    const limitedPhotos = photos.slice(0, MAX_IMAGES_PER_CARD);
    
    card.innerHTML = `
        <div class="stripe-indicators"></div>
        
        <button class="action-button" 
                onclick="handleTelegramClick('${profile.id}', '${profile.telegramUsername}')" 
                aria-label="Contact ${profile.name} on Telegram">
            <svg class="telegram-icon" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
        </button>
        
        <div class="image-gallery">
            ${limitedPhotos.map((photo, index) => `
                <img class="gallery-image ${index === 0 ? 'active' : ''}" 
                     src="${photo.url}" 
                     alt="${profile.name} photo ${index + 1}"
                     onerror="handleImageError(this)" />
            `).join('')}
            
            <div class="nav-area left" onclick="prevImage(this)" aria-label="Previous photo"></div>
            <div class="nav-area center" onclick="openDetails(this)" aria-label="View ${profile.name}'s profile"></div>
            <div class="nav-area right" onclick="nextImage(this)" aria-label="Next photo"></div>
        </div>
        
        <div class="card-content" onclick="openDetails(this)">
            <div class="profile-header">
                <span class="profile-name">${profile.name}</span>
                ${profile.countryFlag ? `<span class="country-flag" aria-label="${profile.country}" title="${profile.country}">${profile.countryFlag}</span>` : ''}
            </div>
            <p class="profile-description">
                ${profile.description}
            </p>
        </div>
    `;
    
    return card;
}

function renderProfiles(profilesData, append = false) {
    const container = document.getElementById('profilesContainer');
    
    if (!append) {
        container.innerHTML = '';
    }
    
    if (!profilesData || !profilesData.profiles || profilesData.profiles.length === 0) {
        if (!append) {
            showMainEmpty();
        }
        return;
    }
    
    profilesData.profiles.forEach((profile, index) => {
        const card = createPhotoCard(profile);
        
        // Add entrance animation delay
        card.style.animationDelay = `${(append ? 0 : index) * 0.1}s`;
        container.appendChild(card);
        
        // Initialize card after adding to DOM
        setTimeout(() => initializeCard(card), 50);
    });
    
    showMainContent();
    updateLoadMoreButton(profilesData.hasMore);
}

function initializeCard(card) {
    const images = getImagesFromCard(card);
    const validImageCount = validateImageCount(card);
    
    // Create stripe indicators
    createStripeIndicators(card, validImageCount);
    
    // Initialize image positions
    images.forEach((image, index) => {
        if (image.classList.contains('active')) {
            image.style.transform = 'translateX(0)';
            image.style.opacity = '1';
        } else {
            image.style.transform = 'translateX(100%)';
            image.style.opacity = '0';
        }
    });
}

// ===== SERVER DATA LOADING =====

async function loadProfiles(page = 1, append = false) {
    if (isLoading) return;
    
    isLoading = true;
    
    try {
        if (!append) {
            showMainLoading();
        } else {
            updateLoadMoreButton(true, true);
        }
        
        // Use smart API call that falls back to mock data
        const profilesData = await smartApiCall(
            () => window.apiService.fetchProfiles({ page, limit: 10 }),
            () => window.apiService.fetchMockProfiles()
        );
        
        currentProfilesData = profilesData;
        currentPage = page;
        hasMoreProfiles = profilesData.hasMore;
        
        renderProfiles(profilesData, append);
        
        console.log(`Loaded ${profilesData.profiles.length} profiles (page ${page})`);
        
    } catch (error) {
        console.error('Failed to load profiles:', error);
        
        if (!append) {
            showMainError(error.message || 'Failed to load profiles');
        } else {
            updateLoadMoreButton(hasMoreProfiles, false);
            // Show temporary error notification for load more failures
            showTemporaryNotification('Failed to load more profiles', 'error');
        }
    } finally {
        isLoading = false;
    }
}

async function loadMoreProfiles() {
    if (!hasMoreProfiles || isLoading) return;
    
    await loadProfiles(currentPage + 1, true);
}

async function retryLoadProfiles() {
    currentPage = 1;
    hasMoreProfiles = true;
    await loadProfiles(1, false);
}

async function refreshProfiles() {
    currentPage = 1;
    hasMoreProfiles = true;
    await loadProfiles(1, false);
}

// ===== INTERACTION HANDLERS =====

function handleTelegramClick(profileId, telegramUsername) {
    if (!telegramUsername) {
        console.warn('No Telegram username available for profile:', profileId);
        return;
    }
    
    // Record interaction analytics
    window.apiService.recordInteraction(profileId, 'telegram_click', {
        source: 'main_page',
        timestamp: new Date().toISOString()
    });
    
    // Open Telegram
    const telegramUrl = `https://t.me/${telegramUsername}`;
    window.open(telegramUrl, '_blank');
}

function handleImageError(imgElement) {
    console.warn('Failed to load image:', imgElement.src);
    
    // Replace with placeholder
    imgElement.src = 'https://via.placeholder.com/300x400/1a0d2e/ffffff?text=Image+Not+Available';
    imgElement.alt = 'Image not available';
    
    // Add error styling
    imgElement.classList.add('image-error');
}

// ===== TEMPORARY NOTIFICATIONS =====

function showTemporaryNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.temp-notification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `temp-notification temp-notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Fade in
    setTimeout(() => notification.classList.add('visible'), 100);
    
    // Fade out and remove
    setTimeout(() => {
        notification.classList.remove('visible');
        setTimeout(() => notification.remove(), 300);
    }, 100);
}

// ===== CARD IDENTIFICATION HELPER =====
function getCardFromElement(element) {
    return element.closest('.photo-card');
}

function getCardId(card) {
    return card.dataset.cardId || Array.from(document.querySelectorAll('.photo-card')).indexOf(card);
}

function getImagesFromCard(card) {
    const allImages = card.querySelectorAll('.gallery-image:not([data-excluded="true"])');
    return Array.from(allImages).slice(0, MAX_IMAGES_PER_CARD);
}

// ===== VALIDATION HELPER =====
function validateImageCount(card) {
    const images = card.querySelectorAll('.gallery-image');
    if (images.length > MAX_IMAGES_PER_CARD) {
        console.warn(`Card ${getCardId(card)} has ${images.length} images. Only first ${MAX_IMAGES_PER_CARD} will be accessible.`);
        
        // Hide excess images
        Array.from(images).slice(MAX_IMAGES_PER_CARD).forEach(img => {
            img.style.display = 'none';
            img.setAttribute('data-excluded', 'true');
        });
    }
    return Math.min(images.length, MAX_IMAGES_PER_CARD);
}

// ===== STRIPE INDICATOR HELPERS =====
function createStripeIndicators(card, imageCount) {
    const stripeContainer = card.querySelector('.stripe-indicators');
    if (!stripeContainer) return;
    
    stripeContainer.innerHTML = '';
    
    if (imageCount <= 1) {
        stripeContainer.style.display = 'none';
        return;
    }
    
    stripeContainer.style.display = 'flex';
    
    for (let i = 0; i < imageCount; i++) {
        const stripe = document.createElement('div');
        stripe.className = 'stripe';
        stripe.setAttribute('data-stripe-index', i);
        
        if (i === 0) {
            stripe.classList.add('active');
        }
        
        stripeContainer.appendChild(stripe);
    }
}

function updateStripeIndicators(card, activeIndex) {
    const stripes = card.querySelectorAll('.stripe');
    
    stripes.forEach((stripe, index) => {
        if (index === activeIndex) {
            stripe.classList.add('active');
        } else {
            stripe.classList.remove('active');
        }
    });
}

// ===== ANIMATION CONTROLLER =====
function slideToImage(direction, currentIndex, targetIndex, images, cardId) {
    const currentImage = images[currentIndex];
    const targetImage = images[targetIndex];
    
    if (direction === 'next') {
        animateImageTransition(
            currentImage, 
            targetImage, 
            'translateX(-100%)',
            'translateX(100%)',
            'translateX(0)',
            cardId
        );
    } else {
        animateImageTransition(
            currentImage, 
            targetImage, 
            'translateX(100%)',
            'translateX(-100%)',
            'translateX(0)',
            cardId
        );
    }
}

// ===== ANIMATION HELPER =====
function animateImageTransition(currentImg, targetImg, currentExit, targetStart, targetEnd, cardId) {
    targetImg.style.transform = targetStart;
    targetImg.style.opacity = '0';
    targetImg.classList.add('active');
    
    requestAnimationFrame(() => {
        currentImg.style.transform = currentExit;
        currentImg.style.opacity = '0';
        
        targetImg.style.transform = targetEnd;
        targetImg.style.opacity = '1';
    });
    
    setTimeout(() => {
        currentImg.classList.remove('active');
        currentImg.style.transform = 'translateX(100%)';
        currentImg.style.opacity = '0';
        animatingCards.delete(cardId);
    }, ANIMATION_DURATION);
}

// ===== NAVIGATION FUNCTIONS =====
function nextImage(element) {
    const card = getCardFromElement(element);
    const cardId = getCardId(card);
    
    if (animatingCards.has(cardId)) return;
    
    const images = getImagesFromCard(card);
    
    // Disable navigation if only 1 image
    if (images.length <= 1) {
    return;
    }
    
    animatingCards.add(cardId);
    
    const currentIndex = Array.from(images).findIndex(img => img.classList.contains('active'));
    const nextIndex = (currentIndex + 1) % images.length;
    
    // Update stripe indicators
    updateStripeIndicators(card, nextIndex);
    
    slideToImage('next', currentIndex, nextIndex, images, cardId);
}

function prevImage(element) {
    const card = getCardFromElement(element);
    const cardId = getCardId(card);
    
    if (animatingCards.has(cardId)) return;
    
    const images = getImagesFromCard(card);
    
    // Disable navigation if only 1 image
    if (images.length <= 1) {
    return;
    }
    
    animatingCards.add(cardId);
    
    const currentIndex = Array.from(images).findIndex(img => img.classList.contains('active'));
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    
    // Update stripe indicators
    updateStripeIndicators(card, prevIndex);
    
    slideToImage('prev', currentIndex, prevIndex, images, cardId);
}

// ===== CENTER AREA FUNCTION =====
function openDetails(element) {
    const card = getCardFromElement(element);
    const cardId = getCardId(card);
    
    // Navigate to profile page with the specific person's ID
    const profileUrl = `profile.html?id=${cardId}`;
    
    console.log(`Opening profile for ${cardId}`);
    window.location.href = profileUrl;
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('Main page initializing...');
    
    // Load initial profiles from server
    loadProfiles(1, false);
    
    // Add keyboard navigation
    document.addEventListener('keydown', handleKeyboardNavigation);
    
    // Add intersection observer for load more functionality
    setupInfiniteScroll();
});

// ===== KEYBOARD NAVIGATION =====
function handleKeyboardNavigation(e) {
    // Escape key to close any modals or overlays
    if (e.key === 'Escape') {
        // Handle escape key if needed
    }
    
    // Arrow keys for navigation (optional enhancement)
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const focusedCard = document.activeElement.closest('.photo-card');
        if (focusedCard) {
            if (e.key === 'ArrowLeft') {
                prevImage(focusedCard.querySelector('.nav-area.left'));
            } else {
                nextImage(focusedCard.querySelector('.nav-area.right'));
            }
        }
    }
}

// ===== INFINITE SCROLL SETUP =====
function setupInfiniteScroll() {
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && hasMoreProfiles && !isLoading) {
                loadMoreProfiles();
            }
        });
    }, {
        rootMargin: '100px' // Start loading when 100px away from the button
    });
    
    if (loadMoreContainer) {
        observer.observe(loadMoreContainer);
    }
}

// ===== ANALYTICS TRACKING =====
function trackProfileView(profileId) {
    window.apiService.recordInteraction(profileId, 'profile_view', {
        source: 'main_page',
        timestamp: new Date().toISOString()
    });
}

function trackImageNavigation(profileId, direction) {
    window.apiService.recordInteraction(profileId, 'image_navigation', {
        direction,
        source: 'main_page',
        timestamp: new Date().toISOString()
    });
}
