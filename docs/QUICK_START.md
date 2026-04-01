# Quick Start Guide - PDF Viewer

## Access the Application

1. Navigate to `/plan-viewer` in the application
2. **Note**: Only accessible to users with `contractor` or `subcontractor` roles

## First Time Setup

### 1. Load a PDF
```
Click "Upload PDF" button → Select a .pdf file
Or use the default sample PDF
```

### 2. Set Measurement Scale (Optional)
```
Click "Scale" button in top bar
→ Draw a reference line on the PDF
→ Enter the real-world distance
→ Select unit (ft, m, in, etc.)
```

## Using the Viewer

### Tool Selection
Use the **left vertical toolbar** to select tools:
- **Select** (arrow) - Click to select existing markups
- **Line** - Draw straight lines
- **Rectangle** - Draw rectangular boxes
- **Ellipse** - Draw circles/ellipses
- **Text** - Add text annotations
- **Polyline** - Draw multi-segment lines
- **Distance** - Measure distances
- **Area** - Measure polygon areas

### Creating Markups
1. Select a tool from the toolbar
2. Click and drag on the PDF to draw
3. For polyline/area: Click multiple points, press Enter to finish
4. The markup appears in the bottom table

### Editing Markups
1. Click a markup on the canvas or in the table
2. Right sidebar shows properties
3. Change color, width, status, etc.
4. Changes auto-save to database

### Adding Comments
1. Select a markup
2. Click the sidebar to switch to "Comments" panel
3. Type your comment and click "Comment"
4. All team members see comments in real-time

### Viewing History
1. Select a markup
2. Switch to "History" panel
3. See all changes with timestamps and authors

## Collaboration Features

### See Active Users
- Top bar shows number of active users
- Each user's viewport is tracked on the server
- Comments sync in real-time

### Assignments
- Manager can assign markups to team members
- Track status: pending → in_progress → completed
- Set due dates

## Export/Import

### Export Markups
1. Click the export icon in the tool rail
2. Downloads JSON file with all markups
3. Contains complete markup data and metadata

### Batch Clear
1. Click the clear icon in the tool rail
2. Confirms deletion of all markups
3. Useful when starting fresh

## Keyboard Shortcuts

```
Escape        - Deselect current markup
Delete        - Delete selected markup
Ctrl+Z        - Undo (future enhancement)
Ctrl+S        - Save (auto-saves)
```

## Tips & Tricks

1. **Zoom Controls**: Use scroll wheel to zoom in/out
2. **Pan**: Click and drag with middle mouse button (or Spacebar + drag)
3. **Quick Select**: Click any markup in the table to select it
4. **Color Coding**: Use different colors to organize markup types
5. **Status Updates**: Mark items as approved/completed to track workflow

## Performance Tips

- For large PDFs (100+ pages), markups on nearby pages preload automatically
- Cache shows in development mode (bottom-right corner)
- 10 pages are kept in memory for fast navigation
- Markups are virtualized - only visible ones render

## Troubleshooting

### PDF Won't Load
- Check file size (limit ~50MB)
- Verify it's a valid PDF
- Try uploading again
- Check browser console for errors

### Markups Not Syncing
- Ensure you're online
- Refresh the page
- Check if user permissions allow access
- Verify database connection

### Slow Performance
- Clear browser cache
- Close other tabs
- Reduce zoom level temporarily
- Check internet connection

### Can't See Other Users' Comments
- Refresh the page
- Verify Realtime subscriptions are active
- Check user has project access

## Common Workflows

### Construction Review
```
1. Upload building plans
2. Set measurement scale
3. Create markup for each issue
4. Add comments with details
5. Assign to crew members
6. Track completion status
```

### Quality Assurance
```
1. Load project document
2. Highlight areas for review
3. Add comments with feedback
4. Mark as approved/rejected
5. Export markup report
6. Share with team
```

### Inspection Documentation
```
1. Take PDF of inspection area
2. Add location markups
3. Photograph issues
4. Reference in comments
5. Generate history report
6. Archive for records
```

## Next Steps

- Read `/docs/PDF_VIEWER_ARCHITECTURE.md` for technical details
- Read `/docs/PDF_VIEWER_API.md` for developer API reference
- Explore the modular component system
- Configure additional measurement scales as needed

## Support

For issues or questions:
1. Check the documentation files in `/docs/`
2. Review the component code - it's well-commented
3. Check browser console for error messages
4. Contact the development team with specific error codes

---

**Happy markup reviewing!** 🎯
