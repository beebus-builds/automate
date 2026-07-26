var fs = require('fs');
var path = require('path');

var CONTENT_FILE = path.join(__dirname, 'data.json');

if (!fs.existsSync(CONTENT_FILE)) {
  console.error('data.json not found. Run `npm run build` after placing your data.json in the project root.');
  console.error('Use the CMS (cms/cms.html) to create and edit data.json.');
  process.exit(1);
}

var content = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
var tpl = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
var cssTpl = fs.readFileSync(path.join(__dirname, 'css', 'style.css'), 'utf8');
var jsSrc = fs.readFileSync(path.join(__dirname, 'js', 'script.js'), 'utf8');

function rgba(hex, alpha) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function darken(hex) {
  var r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 40);
  var g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 40);
  var b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 40);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

var s = content.site;
var h = content.hero;
var a = content.about;
var p = content.philosophy;
var c = content.contact;
var year = new Date().getFullYear();

var html = tpl;
html = html.replace(/{{SITE_TITLE}}/g, escHtml(s.title));
html = html.replace(/{{HERO_TAGLINE}}/g, escHtml(h.tagline));
html = html.replace(/{{HERO_TITLE}}/g, escHtml(h.title));
html = html.replace(/{{HERO_HIGHLIGHT}}/g, escHtml(h.highlight));
html = html.replace(/{{HERO_DESC}}/g, escHtml(h.description));
html = html.replace(/{{INITIALS}}/g, escHtml(h.initials));
html = html.replace(/{{ABOUT_LEAD}}/g, escHtml(a.lead));

var aboutParagraphs = a.paragraphs || [];
html = html.replace('{{ABOUT_P1}}', aboutParagraphs[0] ? '<p>' + escHtml(aboutParagraphs[0]) + '</p>' : '');
html = html.replace('{{ABOUT_P2}}', aboutParagraphs[1] ? '<p>' + escHtml(aboutParagraphs[1]) + '</p>' : '');

var statsHtml = '';
(a.stats || []).forEach(function (st) {
  statsHtml += '<div class="stat"><span class="stat__number">' + escHtml(st.number) + escHtml(st.suffix) + '</span><span class="stat__label">' + escHtml(st.label) + '</span></div>';
});
html = html.replace('{{STATS_HTML}}', statsHtml);

var coursesHtml = '';
(content.courses || []).forEach(function (co) {
  coursesHtml += '<div class="course-card">' +
    '<div class="course-card__icon">' + escHtml(co.icon) + '</div>' +
    '<h3 class="course-card__title">' + escHtml(co.title) + '</h3>' +
    '<p class="course-card__desc">' + escHtml(co.description) + '</p>' +
    '<span class="course-card__level">' + escHtml(co.level) + '</span>' +
    '</div>';
});
html = html.replace('{{COURSES_HTML}}', coursesHtml);

html = html.replace(/{{PHILOSOPHY_QUOTE}}/g, escHtml(p.quote));
html = html.replace(/{{PHILOSOPHY_CITE}}/g, escHtml(p.attribution));

var pointsHtml = '';
(p.points || []).forEach(function (pt) {
  pointsHtml += '<div class="philosophy__point"><h3>' + escHtml(pt.title) + '</h3><p>' + escHtml(pt.description) + '</p></div>';
});
html = html.replace('{{PHILOSOPHY_POINTS_HTML}}', pointsHtml);

var achievementsHtml = '';
(content.achievements || []).forEach(function (ach) {
  achievementsHtml += '<div class="achievement-card">' +
    '<span class="achievement-card__year">' + escHtml(ach.year) + '</span>' +
    '<h3 class="achievement-card__title">' + escHtml(ach.title) + '</h3>' +
    '<p>' + escHtml(ach.description) + '</p>' +
    '</div>';
});
html = html.replace('{{ACHIEVEMENTS_HTML}}', achievementsHtml);

html = html.replace(/{{CONTACT_EMAIL}}/g, escHtml(c.email));
html = html.replace(/{{CONTACT_PHONE}}/g, escHtml(c.phone));
html = html.replace(/{{CONTACT_LOCATION}}/g, escHtml(c.location));
html = html.replace(/{{YEAR}}/g, year);

// SEO
var seo = content.seo || {};
var metaTitle = seo.metaTitle || s.title || '';
var metaDesc = seo.metaDesc || h.description || '';
var ogImage = seo.ogImage || '';
var gaId = seo.googleAnalytics || '';
var gaScript = gaId ? '<script async src="https://www.googletagmanager.com/gtag/js?id=' + escHtml(gaId) + '"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","' + escHtml(gaId) + '");</script>' : '';
html = html.replace(/{{SEO_TITLE}}/g, escHtml(metaTitle));
html = html.replace(/{{SEO_DESC}}/g, escHtml(metaDesc));
html = html.replace(/{{SEO_IMAGE}}/g, escHtml(ogImage));
html = html.replace('{{GA_SCRIPT}}', gaScript);

var themes = JSON.parse(fs.readFileSync(path.join(__dirname, 'themes', 'index.json'), 'utf8'));
var selectedTheme = themes[content.theme.name || 'modern'];
var css = cssTpl;
css = css.replace(/{{PRIMARY_COLOR}}/g, selectedTheme.primary);
css = css.replace(/{{PRIMARY_DARK}}/g, darken(selectedTheme.primary));
css = css.replace(/{{PRIMARY_LIGHT}}/g, rgba(selectedTheme.primary, 0.12));
css = css.replace(/{{ACCENT_COLOR}}/g, selectedTheme.accent);
css = css.replace(/{{ACCENT_LIGHT}}/g, rgba(selectedTheme.accent, 0.12));

var styleOpts = content.style || {};
var sectionStyle = styleOpts.sectionStyle || 'bordered';

html = html.replace('class="layout-wide"', 'class="layout-' + (content.theme.layout || 'wide') + ' sec-' + sectionStyle + '"');

// Style customizations
var fonts = JSON.parse(fs.readFileSync(path.join(__dirname, 'themes', 'fonts.json'), 'utf8'));
var fontPair = fonts[styleOpts.fontPair || 'modern-sans'] || fonts['modern-sans'];

var roundness = styleOpts.roundness || 'rounded';
var radiusMap = {
  sharp:  { sm: '2px',  md: '4px',  lg: '6px',  full: '8px' },
  rounded:{ sm: '8px',  md: '12px', lg: '16px', full: '9999px' },
  pill:   { sm: '24px', md: '32px', lg: '40px', full: '9999px' }
};
var rad = radiusMap[roundness] || radiusMap.rounded;

var shadowDepth = styleOpts.shadowDepth || 'soft';
var shadowMap = {
  flat:  { sm: 'none', md: 'none', lg: 'none', xl: 'none' },
  soft:  { sm: '0 1px 2px rgba(0,0,0,0.05)', md: '0 4px 6px -1px rgba(0,0,0,0.07),0 2px 4px -2px rgba(0,0,0,0.05)', lg: '0 10px 15px -3px rgba(0,0,0,0.08),0 4px 6px -4px rgba(0,0,0,0.04)', xl: '0 20px 25px -5px rgba(0,0,0,0.08),0 8px 10px -6px rgba(0,0,0,0.04)' },
  elevated: { sm: '0 2px 4px rgba(0,0,0,0.08)', md: '0 8px 16px rgba(0,0,0,0.1)', lg: '0 16px 24px rgba(0,0,0,0.1)', xl: '0 24px 48px rgba(0,0,0,0.12)' },
  deep:  { sm: '0 3px 6px rgba(0,0,0,0.12)', md: '0 12px 24px rgba(0,0,0,0.14)', lg: '0 24px 48px rgba(0,0,0,0.16)', xl: '0 40px 80px rgba(0,0,0,0.2)' }
};
var shad = shadowMap[shadowDepth] || shadowMap.soft;

var spacingMap = { compact: '48px', normal: '96px', spacious: '140px' };
var sectionPad = spacingMap[styleOpts.spacing || 'normal'] || spacingMap.normal;

var btnStyleMap = { square: '2px', rounded: '12px', pill: '9999px' };
var btnRadius = btnStyleMap[styleOpts.buttonStyle || 'rounded'] || btnStyleMap.rounded;

var headerPos = styleOpts.headerFixed !== false ? 'fixed' : 'relative';
var hasHeaderPad = headerPos === 'fixed' ? 'padding-top: 80px;' : '';
if (hasHeaderPad) {
  html = html.replace('</head>', '<style>body.website-page { ' + hasHeaderPad + ' }</style></head>');
}

css = css.replace(/{{FONT_HEADING}}/g, fontPair.heading);
css = css.replace(/{{FONT_BODY}}/g, fontPair.body);
css = css.replace(/{{RADIUS_SM}}/g, rad.sm);
css = css.replace(/{{RADIUS_MD}}/g, rad.md);
css = css.replace(/{{RADIUS_LG}}/g, rad.lg);
css = css.replace(/{{RADIUS_FULL}}/g, rad.full);
css = css.replace(/{{SHADOW_SM}}/g, shad.sm);
css = css.replace(/{{SHADOW_MD}}/g, shad.md);
css = css.replace(/{{SHADOW_LG}}/g, shad.lg);
css = css.replace(/{{SHADOW_XL}}/g, shad.xl);
css = css.replace(/{{SECTION_PADDING}}/g, sectionPad);
css = css.replace(/{{HEADER_BEHAVIOR}}/g, headerPos);
css = css.replace(/{{BTN_RADIUS}}/g, btnRadius);

var distDir = path.join(__dirname, 'dist');
var cssDir = path.join(distDir, 'css');
var jsDir = path.join(distDir, 'js');

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir, { recursive: true });
fs.mkdirSync(cssDir, { recursive: true });
fs.mkdirSync(jsDir, { recursive: true });

fs.writeFileSync(path.join(distDir, 'index.html'), html);
fs.writeFileSync(path.join(cssDir, 'style.css'), css);
fs.writeFileSync(path.join(jsDir, 'script.js'), jsSrc);

console.log('Website built successfully in dist/');
