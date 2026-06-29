// ─── src/models/LayoutConfig.js ──────────────────────────────────────────────
// Stores school website layout structures, custom pages, homepage sections,
// navigation customizer settings, and footer widgets.

const mongoose = require('mongoose');

// Default initial pages in recommended ordering
const DEFAULT_PAGES = [
  // ─ Core pages (enabled by default)
  { id: 'home', label: 'Home', enabled: true, order: 1, isCustom: false },
  { id: 'about', label: 'About Us', enabled: true, order: 2, isCustom: false },
  { id: 'principal-msg', label: 'Message', enabled: true, order: 3, isCustom: false },
  { id: 'director-msg', label: 'Director Message', enabled: false, order: 4, isCustom: false },
  { id: 'vice-principal-msg', label: 'Vice Principal Msg', enabled: false, order: 5, isCustom: false },
  // ─ Academics
  { id: 'academics', label: 'Academics', enabled: true, order: 6, isCustom: false },
  { id: 'curriculum', label: 'Curriculum', enabled: false, order: 7, isCustom: false },
  { id: 'faculty', label: 'Faculty & Staff', enabled: false, order: 8, isCustom: false },
  { id: 'infrastructure', label: 'Infrastructure', enabled: false, order: 9, isCustom: false },
  // ─ Admissions
  { id: 'admissions', label: 'Admissions', enabled: true, order: 10, isCustom: false },
  // ─ Student Life & Activities
  { id: 'student-life', label: 'Student Life', enabled: false, order: 11, isCustom: false },
  { id: 'events', label: 'Events', enabled: false, order: 12, isCustom: false },
  { id: 'achievements', label: 'Achievements', enabled: false, order: 13, isCustom: false },
  // ─ News & Media
  { id: 'news', label: 'News', enabled: true, order: 14, isCustom: false },
  { id: 'announcements', label: 'Announcements', enabled: false, order: 15, isCustom: false },
  { id: 'gallery', label: 'Gallery', enabled: true, order: 16, isCustom: false },
  { id: 'video-gallery', label: 'Video Gallery', enabled: false, order: 17, isCustom: false },
  { id: 'testimonials', label: 'Testimonials', enabled: false, order: 18, isCustom: false },
  // ─ Circulars & Compliance
  { id: 'notices', label: 'Notices', enabled: true, order: 19, isCustom: false },
  { id: 'downloads', label: 'Downloads', enabled: false, order: 20, isCustom: false },
  { id: 'mandatory-disclosure', label: 'Mandatory Disclosure', enabled: false, order: 21, isCustom: false },
  // ─ More Pages
  { id: 'careers', label: 'Careers', enabled: false, order: 22, isCustom: false },
  { id: 'alumni', label: 'Alumni', enabled: false, order: 23, isCustom: false },
  { id: 'faq', label: 'FAQ', enabled: false, order: 24, isCustom: false },
  { id: 'contact', label: 'Contact Us', enabled: true, order: 25, isCustom: false },
  // ─ Legal
  { id: 'privacy-policy', label: 'Privacy Policy', enabled: false, order: 26, isCustom: false },
  { id: 'terms', label: 'Terms & Conditions', enabled: false, order: 27, isCustom: false },
];

// Default homepage builder sections in order
const DEFAULT_HOMEPAGE_SECTIONS = [
  { id: 'hero', label: 'Hero Banner Slider', enabled: true, order: 1, title: 'Welcome to Our Academy', subtitle: 'Excellence in Education & Values' },
  { id: 'welcome', label: 'Welcome Intro Section', enabled: true, order: 2, title: 'About Our Institution', subtitle: 'Nurturing minds since 1998' },
  { id: 'principal-msg', label: 'Principal Message Brief', enabled: true, order: 3, title: 'Message from the Desk of Principal', subtitle: 'Leading with Vision and Compassion' },
  { id: 'stats', label: 'Statistics Counter', enabled: true, order: 4 },
  { id: 'facilities', label: 'Facilities Grid', enabled: true, order: 5, title: 'State-of-the-Art Facilities', subtitle: 'Providing resources for all-round growth' },
  { id: 'notice-board', label: 'Notice Board Widget', enabled: true, order: 6, title: 'Announcements & Circulars' },
  { id: 'news-events', label: 'Latest News & Events', enabled: true, order: 7, title: 'Latest Happenings', subtitle: 'Check out recent school achievements and activities' },
  { id: 'gallery', label: 'Photo Gallery Slider', enabled: true, order: 8, title: 'Life at Campus', subtitle: 'Capturing moments of joy and learning' },
  { id: 'testimonials', label: 'Testimonials Carousel', enabled: true, order: 9, title: 'What Parents Say', subtitle: 'Feedback from our community' },
  { id: 'contact', label: 'Contact Form & Map', enabled: true, order: 10, title: 'Get In Touch' },
];

const sectionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  backgroundImage: { type: String, default: '' },
  videoUrl: { type: String, default: '' },
  animationType: { type: String, default: 'fade-up' }, // fade, slide, zoom, fade-up
  type: { type: String, default: 'custom' }, // E.g., 'hero', 'about'
  variation: { type: String, default: 'default' }, // E.g., 'layout-1'
  design: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
});

const pageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  isCustom: { type: Boolean, default: false },
  slug: { type: String }, // Required for custom pages
  content: { type: String, default: '' }, // Markdown/HTML custom page contents
  sections: { type: [sectionSchema], default: [] }, // Reorderable layout sections for any page
});

const layoutConfigSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    // Switch between layout templates
    layoutType: {
      type: String,
      enum: ['modern', 'classic', 'corporate', 'education', 'premium', 'minimal', 'creative'],
      default: 'modern',
    },
    // Header & Navigation options
    navigation: {
      navLogo: { type: String, default: '' },    // Header logo image URL or base64
      headerStyle: { type: String, default: 'sticky' }, // default, sticky, transparent
      megaMenu: { type: Boolean, default: false },
      stickyHeader: { type: Boolean, default: true },
      transparentHeader: { type: Boolean, default: false },
      topBar: {
        show: { type: Boolean, default: true },
        phone: { type: String, default: '' },
        email: { type: String, default: '' },
      },
      admissionButton: {
        show: { type: Boolean, default: true },
        text: { type: String, default: 'Apply Now' },
        link: { type: String, default: '/admissions/apply' }
      },
      loginButton: {
        show: { type: Boolean, default: true },
        text: { type: String, default: 'Portal Login' },
        link: { type: String, default: '/login' }
      },
      socialIcons: {
        facebook: { type: String, default: '' },
        twitter: { type: String, default: '' },
        instagram: { type: String, default: '' },
        youtube: { type: String, default: '' },
      }
    },
    // Website Footer customization
    footer: {
      layoutType: { type: String, default: '4-columns' }, // 3-columns, 4-columns, simple
      copyrightText: { type: String, default: 'All rights reserved.' },
      showNewsletter: { type: Boolean, default: true },
      showMap: { type: Boolean, default: true },
    },
    // Pages configuration list
    pages: {
      type: [pageSchema],
      default: () => DEFAULT_PAGES,
    },
    // Reorderable sections for Homepage
    homepageSections: {
      type: [sectionSchema],
      default: () => DEFAULT_HOMEPAGE_SECTIONS,
    },
    // Quick Reusable Widget status togglers
    widgets: {
      noticeBoard: { show: { type: Boolean, default: true }, title: { type: String, default: 'Latest Announcements' } },
      eventCalendar: { show: { type: Boolean, default: true }, title: { type: String, default: 'Academic Events' } },
      downloads: { show: { type: Boolean, default: true }, title: { type: String, default: 'Notice Circular Downloads' } },
      faq: { show: { type: Boolean, default: true }, title: { type: String, default: 'Frequently Asked Questions' } }
    },
    // Rule 19: Layout version counter — incremented on every update for version history
    layoutVersion: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

module.exports = mongoose.model('LayoutConfig', layoutConfigSchema);
