# User Profile Section Implementation Guide

## Step 1: Add Profile to Sidebar Navigation

In `static/index.html`, find the sidebar navigation section and add this AFTER the "Tools" section (around line 70):

```html

```

## Step 2: Add Profile Section HTML

Add this section BEFORE the closing `</main>` tag (after the translate section, around line 650):

```html

```

## Step 3: Add CSS Styles

Add these styles to `static/css/dashboard.css` at the end of the file:

```css

```

## Step 4: Add JavaScript Functions

Add these functions to `static/js/dashboard.js` at the end of the file (before the last closing brace):

```javascript

```

## Step 5: Update navigateTo Function

Find the `navigateTo` function in `dashboard.js` and add this code inside it (after updating sections):

```javascript
function navigateTo(sectionId) {
    // ... existing code ...
    
    // Load profile data when navigating to profile
    if (sectionId === 'profile') {
        loadUserProfile();
    }
    
    // ... rest of existing code ...
}
```

## Step 6: Update Page Title Mapping

Find the `updatePageTitle` function in `dashboard.js` and add profile to the titles object:

```javascript
const titles = {
    'dashboard': { title: 'Dashboard', breadcrumb: 'Overview' },
    'upload': { title: 'Upload Document', breadcrumb: 'Analysis > Upload' },
    'summary': { title: 'Document Summary', breadcrumb: 'Analysis > Summary' },
    'vision': { title: 'Medical Imaging', breadcrumb: 'Analysis > Vision' },
    'trends': { title: 'Lab Trends', breadcrumb: 'Tools > Trends' },
    'risks': { title: 'Risk Assessment', breadcrumb: 'Tools > Risk' },
    'chat': { title: 'Medical Assistant', breadcrumb: 'Tools > Chat' },
    'translate': { title: 'Translation', breadcrumb: 'Tools > Translate' },
    'profile': { title: 'User Profile', breadcrumb: 'Account > Profile' }  // ADD THIS LINE
};
```

## Testing

1. Restart your server
2. Login to the dashboard
3. Click on "Profile" in the sidebar
4. You should see:
   - Your name and email
   - Document count
   - Password change form
   - Logout button

## Features

✅ Display user information (name, email)
✅ Show document count
✅ Change password functionality
✅ Logout button
✅ Beautiful gradient design
✅ Form validation
✅ Success/error messages
✅ Auto-redirect after password change

That's it! Your profile section is now complete.
