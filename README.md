# Photo Gallery Cards

A modern, responsive photo gallery with interactive cards featuring multiple user profiles. Each card contains a navigable image gallery with stripe indicators and animated Telegram contact buttons.

## Project Structure

```
photo-gallery/
├── index.html      # Main HTML structure
├── styles.css      # All CSS styling and animations
├── script.js       # JavaScript functionality
└── README.md       # Project documentation
```

## Features

- **Photo Navigation**: Click left/right sides of cards or use keyboard arrows to navigate between images
- **Stripe Indicators**: Visual progress indicators showing current photo position
- **Telegram Contact**: Animated contact buttons with pulsing wave effects
- **Touch Support**: Swipe gestures for mobile navigation
- **Keyboard Navigation**: Arrow keys, Enter, Space, and 'T' for Telegram
- **Responsive Design**: Adapts to different screen sizes
- **Accessibility**: ARIA labels, focus indicators, and reduced motion support

## Usage

1. Open `index.html` in a web browser
2. Navigate between photos by:
   - Clicking the left/right areas of each card
   - Using arrow keys when a card is focused
   - Swiping left/right on mobile devices
3. Click the bottom area to view card details
4. Click the blue Telegram button to contact the profile

## File Connections

- `index.html` links to `styles.css` via `<link rel="stylesheet" href="styles.css">`
- `index.html` includes `script.js` via `<script src="script.js"></script>`
- All functionality is modular and self-contained

## Customization

### Adding New Cards
1. Add a new card div in `index.html` with a unique `data-card` attribute
2. Include the required structure: stripe indicators, photo container, nav areas, and Telegram button
3. The JavaScript will automatically initialize the new card

### Adding More Photos
Simply add more `<img>` elements with the `photo` class inside the `photo-container` div. The stripe indicators will automatically adjust.

### Styling
All visual customization can be done through CSS variables defined in `:root` at the top of `styles.css`.

## Browser Support

- Modern browsers with ES6+ support
- Mobile browsers with touch event support
- Graceful degradation for older browsers
