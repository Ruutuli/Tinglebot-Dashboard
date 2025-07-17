# Relationships Feature Documentation

## Overview

The Relationships feature allows users to track and manage relationships between their characters (OCs) and other characters in the Tinglebot Dashboard. Users can create, view, and manage different types of relationships with visual indicators and detailed notes.

## Features

### Relationship Types
The system supports 9 different relationship types, each with a unique emoji indicator:

| Emoji | Type | Description |
|-------|------|-------------|
| ❤️ | LOVERS | Romantic partners |
| 🧡 | CRUSH | One-sided romantic interest |
| 💛 | CLOSE_FRIEND | Best friends, very close |
| 💚 | FRIEND | Good friends |
| 💙 | ACQUAINTANCE | Know each other, not close |
| 💜 | DISLIKE | Don't get along well |
| 🖤 | HATE | Strong negative feelings |
| 🤍 | NEUTRAL | Indifferent, no strong feelings |
| 🤎 | OTHER | Custom relationship type |

### Core Functionality

1. **Character Selection**: Users select which of their characters to manage relationships for
2. **Relationship Management**: Add, view, edit, and delete relationships
3. **Notes System**: Optional notes for each relationship
4. **Mutual Relationships**: Mark relationships as mutual between characters
5. **Visual Interface**: Clean, card-based UI with relationship type icons

## User Interface

### Navigation
- Access via "Relationships" link in the main sidebar
- Heart icon (💕) indicates the feature

### Character Selection Screen
- Displays all user's characters in card format
- Shows character name, race, job, and icon
- "Manage Relationships" button for each character

### Relationships Display
- Shows all relationships for the selected character
- Relationship cards display:
  - Relationship type with emoji
  - Target character name
  - Optional notes
  - Mutual relationship indicator
  - Edit/delete buttons

### Add Relationship Modal
- Dropdown to select target character
- Relationship type selection with emojis
- Optional notes textarea
- Mutual relationship checkbox
- Save/Cancel buttons

## Technical Implementation

### Database Schema

**RelationshipModel.js**
```javascript
{
  userId: String,           // Discord user ID
  characterId: ObjectId,    // User's character
  targetCharacterId: ObjectId, // Other character
  relationshipType: String,  // One of 9 types
  notes: String,           // Optional notes
  isMutual: Boolean,       // Mutual relationship flag
  createdAt: Date,
  updatedAt: Date
}
```

### API Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/characters/user` | GET | Get user's characters | Yes |
| `/api/relationships/character/:characterId` | GET | Get character relationships | Yes |
| `/api/relationships` | POST | Create new relationship | Yes |
| `/api/relationships/:relationshipId` | DELETE | Delete relationship | Yes |

### Frontend Architecture

**File Structure:**
```
public/
├── js/
│   └── relationships.js    # Main functionality
├── css/
│   └── relationships.css   # Styling
└── index.html             # UI structure
```

**Key Components:**
- `showRelationshipsSection()` - Main entry point
- `loadUserCharacters()` - Fetch user's characters
- `renderCharacterSelector()` - Display character cards
- `renderGuestMessage()` - Show login prompt for guests
- `selectCharacter()` - Handle character selection
- `saveRelationship()` - Create new relationships
- `deleteRelationship()` - Remove relationships

## Authentication & Security

### Guest Mode
- Unauthenticated users see login prompt
- Clean message with Discord login button
- No access to relationship data

### Authenticated Users
- Can view and manage their own characters' relationships
- API routes require authentication
- Character ownership verification
- User can only manage relationships for their own characters

## Usage Instructions

### For Authenticated Users

1. **Navigate to Relationships**
   - Click "Relationships" in the sidebar
   - Page loads with your characters displayed

2. **Select a Character**
   - Click "Manage Relationships" on any character card
   - Character name appears in header
   - Relationships display section becomes visible

3. **Add a Relationship**
   - Click "Add Relationship" button
   - Select target character from dropdown
   - Choose relationship type
   - Add optional notes
   - Check "Mutual" if applicable
   - Click "Save Relationship"

4. **Manage Existing Relationships**
   - View relationship cards with type icons
   - Click edit button to modify
   - Click delete button to remove
   - Confirm deletion in popup

### For Guest Users

1. **Access Relationships Page**
   - Click "Relationships" in sidebar
   - See authentication required message

2. **Login**
   - Click "Login with Discord" button
   - Complete Discord OAuth flow
   - Return to relationships page

## Error Handling

### Common Scenarios
- **401 Unauthorized**: User not logged in, shows login prompt
- **404 Not Found**: Character doesn't exist or access denied
- **409 Conflict**: Relationship already exists between characters
- **Network Errors**: Graceful error messages with retry options

### User Feedback
- Success messages for successful operations
- Error messages for failed operations
- Loading states during API calls
- Confirmation dialogs for destructive actions

## Styling & Responsive Design

### CSS Features
- Modern card-based design
- Hover effects and animations
- Responsive grid layouts
- Mobile-friendly interface
- Consistent with dashboard theme

### Visual Elements
- Relationship type emojis
- Character icons and avatars
- Status indicators for mutual relationships
- Clean modal dialogs
- Intuitive button styling

## Future Enhancements

### Planned Features
- **Relationship History**: Track relationship changes over time
- **Bulk Operations**: Add multiple relationships at once
- **Relationship Templates**: Predefined relationship types
- **Character Groups**: Organize characters into groups
- **Relationship Analytics**: Statistics and insights
- **Export/Import**: Backup and restore relationships

### Technical Improvements
- **Real-time Updates**: WebSocket integration for live updates
- **Advanced Filtering**: Filter relationships by type, character, etc.
- **Search Functionality**: Find specific relationships quickly
- **Relationship Suggestions**: AI-powered relationship recommendations

## Troubleshooting

### Common Issues

**Page not loading:**
- Check browser console for JavaScript errors
- Verify all CSS and JS files are loading
- Ensure user is authenticated (if required)

**Relationships not saving:**
- Verify user is logged in
- Check network connectivity
- Ensure all required fields are filled

**Character not appearing:**
- Verify character belongs to logged-in user
- Check character data in database
- Refresh page and try again

### Debug Information
- Console logs show detailed operation flow
- Network tab shows API request/response details
- Error messages provide specific failure reasons

## API Reference

### Request/Response Examples

**Get User Characters:**
```javascript
GET /api/characters/user
Response: { characters: [...] }
```

**Create Relationship:**
```javascript
POST /api/relationships
Body: {
  characterId: "char_id",
  targetCharacterId: "target_char_id", 
  relationshipType: "FRIEND",
  notes: "Optional notes",
  isMutual: false
}
```

**Delete Relationship:**
```javascript
DELETE /api/relationships/:relationshipId
Response: { message: "Relationship deleted successfully" }
```

## Contributing

### Development Setup
1. Ensure all dependencies are installed
2. Start the development server
3. Navigate to relationships page
4. Test both authenticated and guest modes

### Code Standards
- Follow existing JavaScript patterns
- Use consistent error handling
- Maintain responsive design principles
- Add appropriate console logging
- Include proper documentation

---

*This feature enhances the Tinglebot Dashboard by providing a comprehensive relationship management system for character interactions and storytelling.* 