// ─── src/models/Theme.js ─────────────────────────────────────────────────────
// Full theme configuration for each project
// One theme document per project (upsert on update)

const mongoose = require('mongoose');

const themeSchema = new mongoose.Schema(
  {
    // References Project.projectId (the slug, not _id)
    projectId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    schoolId: {
      type: String,
      trim: true,
      default: '',
    },
    primaryColor: { type: String, default: '#e63946' },
    secondaryColor: { type: String, default: '#457b9d' },
    accentColor: { type: String, default: '#f1faee' },
    backgroundColor: { type: String, default: '#ffffff' },
    textColor: { type: String, default: '#1d3557' },
    sidebarColor: { type: String, default: '#1d3557' },
    navbarColor: { type: String, default: '#e63946' },
    buttonColor: { type: String, default: '#e63946' },
    // Asset URLs (Cloudinary or any CDN)
    logo: { type: String, default: '' },
    favicon: { type: String, default: '' },
    footerLogo: { type: String, default: '' },
    loginBackground: { type: String, default: '' },
    dashboardBackground: { type: String, default: '' },
    loader: { type: String, default: '' }, // Loading spinner asset URL
    // Typography & style
    fontFamily: { type: String, default: 'Inter, sans-serif' },
    headingFont: { type: String, default: 'Poppins, sans-serif' },
    fontSize: { type: String, default: '14px' },
    borderRadius: { type: String, default: '8px' },
    shadows: { type: String, default: 'md' }, // sm, md, lg, none
    iconsStyle: { type: String, default: 'lucide' },
    darkMode: { type: Boolean, default: false },
    // Advanced: raw CSS injected into the school app
    customCSS: { type: String, default: '' },
  },
  { timestamps: { createdAt: false, updatedAt: 'updatedAt' } }
);

module.exports = mongoose.model('Theme', themeSchema);
