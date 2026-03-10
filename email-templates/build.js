#!/usr/bin/env node

/**
 * Waterboyz Email Template Builder
 *
 * Generates inline-styled HTML email templates that are mobile-friendly
 * and compatible with major email clients. Templates use a shared layout
 * with customizable content sections.
 *
 * Usage:
 *   node build.js                  # Build all templates
 *   node build.js welcome          # Build a specific template
 *   node build.js --list           # List available templates
 *   node build.js --preview welcome # Open preview in browser
 *
 * Templates are defined in the `templates` object below. Each template
 * specifies a subject, preheader, body sections, and an optional action.
 *
 * Output goes to the `dist/` directory as .html files.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Brand colors and config
const brand = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  accent: '#0ea5e9',
  dark: '#1e293b',
  text: '#334155',
  textLight: '#64748b',
  border: '#e2e8f0',
  bgPage: '#f1f5f9',
  bgCard: '#ffffff',
  bgFooter: '#1e293b',
  radius: '8px',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  logoUrl: 'https://waterboyz.kinops.io/app/spa/logo.png',
  orgName: 'Waterboyz',
  siteUrl: 'https://waterboyz.kinops.io',
  supportEmail: 'support@waterboyz.org',
};

/**
 * Wraps content sections in the shared email layout.
 * All styles are inlined for email client compatibility.
 */
function layout({ subject, preheader, body, footer }) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${subject}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
    /* Mobile */
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .fluid { max-width: 100% !important; height: auto !important; }
      .stack-column { display: block !important; width: 100% !important; }
      .padding-mobile { padding-left: 20px !important; padding-right: 20px !important; }
      .btn-mobile { display: block !important; width: 100% !important; }
      .btn-mobile a { display: block !important; width: 100% !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:${brand.bgPage}; font-family:${brand.fontFamily};">
  <!-- Preheader (hidden preview text) -->
  <div style="display:none; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
    ${preheader || ''}
    ${'&#847; &zwnj; &nbsp; '.repeat(20)}
  </div>

  <!-- Email wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${brand.bgPage};">
    <tr>
      <td style="padding: 24px 0;">
        <div style="max-width:600px; margin:0 auto;" class="email-container">

          <!-- Logo header -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding: 0 0 24px; text-align:center;">
                <a href="${brand.siteUrl}" style="text-decoration:none;">
                  <img src="${brand.logoUrl}" width="160" alt="${brand.orgName}" style="width:160px; max-width:160px; height:auto;" />
                </a>
              </td>
            </tr>
          </table>

          <!-- Card body -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${brand.bgCard}; border-radius:${brand.radius}; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            ${body}
          </table>

          <!-- Footer -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:24px;">
            <tr>
              <td style="padding:0 24px; text-align:center; font-size:13px; line-height:20px; color:${brand.textLight};" class="padding-mobile">
                ${footer || defaultFooter()}
              </td>
            </tr>
          </table>

        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function defaultFooter() {
  return `
    <p style="margin:0 0 8px;">
      ${brand.orgName} &bull; Serving families through home repair &amp; community volunteers
    </p>
    <p style="margin:0; color:${brand.textLight};">
      <a href="${brand.siteUrl}" style="color:${brand.accent}; text-decoration:underline;">${brand.siteUrl.replace('https://', '')}</a>
    </p>`;
}

// ── Content helpers ──────────────────────────────────────────────

function heading(text) {
  return `
    <tr>
      <td style="padding:36px 40px 0;" class="padding-mobile">
        <h1 style="margin:0; font-size:24px; font-weight:700; line-height:32px; color:${brand.dark};">
          ${text}
        </h1>
      </td>
    </tr>`;
}

function paragraph(text) {
  return `
    <tr>
      <td style="padding:16px 40px 0;" class="padding-mobile">
        <p style="margin:0; font-size:16px; line-height:26px; color:${brand.text};">
          ${text}
        </p>
      </td>
    </tr>`;
}

function action(label, url) {
  return `
    <tr>
      <td style="padding:28px 40px 0;" class="padding-mobile">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="btn-mobile">
          <tr>
            <td style="border-radius:6px; background-color:${brand.primary};">
              <a href="${url}" target="_blank" style="display:inline-block; padding:14px 32px; font-size:16px; font-weight:600; font-family:${brand.fontFamily}; color:#ffffff; text-decoration:none; border-radius:6px;">
                ${label}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function note(text) {
  return `
    <tr>
      <td style="padding:20px 40px 0;" class="padding-mobile">
        <p style="margin:0; font-size:13px; line-height:20px; color:${brand.textLight};">
          ${text}
        </p>
      </td>
    </tr>`;
}

function divider() {
  return `
    <tr>
      <td style="padding:28px 40px 0;" class="padding-mobile">
        <hr style="border:none; border-top:1px solid ${brand.border}; margin:0;">
      </td>
    </tr>`;
}

function spacer(height = 36) {
  return `
    <tr>
      <td style="padding:0; height:${height}px; font-size:1px; line-height:1px;">&nbsp;</td>
    </tr>`;
}

// ── Template definitions ─────────────────────────────────────────

const templates = {
  welcome: {
    subject: 'Welcome to Waterboyz — Set Up Your Account',
    preheader:
      'Your Waterboyz account is ready. Set your password to get started.',
    build: () => {
      const body = [
        heading('Welcome to Waterboyz!'),
        paragraph(
          "Hi <%= @results['Get User']['Display Name'] %>,",
        ),
        paragraph(
          "Your account on the <strong>Waterboyz portal</strong> is ready! This is our home base for coordinating volunteers, sharing updates, and working together to serve families in our community.",
        ),
        paragraph(
          "Set your password below to get started:",
        ),
        action(
          'Set Your Password',
          "<%= @results['Get Password Reset URL']['Password Reset Link'] %>",
        ),
        note(
          "This link will expire after 24 hours. If it has expired, visit the portal and use the \"Forgot Password\" option to request a new one.",
        ),
        divider(),
        paragraph(
          "Once you're in, you'll be able to see what's happening, keep your profile up to date, and stay connected with the team.",
        ),
        paragraph(
          "If you have any questions, don't hesitate to reach out.",
        ),
        paragraph(
          "See you inside,<br><strong>The Waterboyz Team</strong>",
        ),
        spacer(),
      ].join('');

      return layout({
        subject: 'Welcome to Waterboyz — Set Up Your Account',
        preheader:
          'Your Waterboyz account is ready. Set your password to get started.',
        body,
      });
    },
  },

  'password-reset': {
    subject: 'Reset Your Password — Waterboyz',
    preheader: 'Use the link below to reset your Waterboyz portal password.',
    build: () => {
      const body = [
        heading('Reset Your Password'),
        paragraph(
          'Hi <%= @results["Get User"]["Display Name"] %>,',
        ),
        paragraph(
          "We received a request to reset the password for your Waterboyz account. Click the button below to choose a new password:",
        ),
        action(
          'Reset Password',
          '<%= @results["Get Password Reset URL"]["Password Reset Link"] %>',
        ),
        note(
          "This link will expire after 24 hours. If you didn't request a password reset, you can safely ignore this email — your account is secure.",
        ),
        divider(),
        paragraph(
          "Need help? Contact us at <a href=\"mailto:${brand.supportEmail}\" style=\"color:${brand.primary}; text-decoration:underline;\">${brand.supportEmail}</a>.",
        ),
        spacer(),
      ].join('');

      return layout({
        subject: 'Reset Your Password — Waterboyz',
        preheader: 'Use the link below to reset your Waterboyz portal password.',
        body,
      });
    },
  },

  'project-assignment': {
    subject: "You've Been Assigned to a Project — Waterboyz",
    preheader: "You've been assigned as Project Captain for an upcoming SWAT project.",
    build: () => {
      const body = [
        heading("You're a Project Captain! 🛠️"),
        paragraph(
          'Hi <%= @results["Get User"]["Display Name"] %>,',
        ),
        paragraph(
          'You\'ve been assigned as <strong>Project Captain</strong> for <strong><%= @results["Get Project"]["Project Name"] %></strong>, scheduled for <%= @results["Get Project"]["Scheduled Date"] %>.',
        ),
        paragraph(
          'Head to the portal to view project details, manage volunteers, and track expenses.',
        ),
        action('View Project', '<%= @results["Get Project"]["Project URL"] %>'),
        divider(),
        paragraph(
          'Thank you for leading this effort — families are counting on you!',
        ),
        paragraph(
          'The Waterboyz Team',
        ),
        spacer(),
      ].join('');

      return layout({
        subject: "You've Been Assigned to a Project — Waterboyz",
        preheader: "You've been assigned as Project Captain.",
        body,
      });
    },
  },

  'volunteer-confirmation': {
    subject: "You're Signed Up — Waterboyz",
    preheader: "Thanks for volunteering! Here are the details for your upcoming project.",
    build: () => {
      const body = [
        heading('Thanks for Volunteering! 🎉'),
        paragraph(
          'Hi <%= @results["Get Volunteer"]["First Name"] %>,',
        ),
        paragraph(
          "You've signed up to volunteer for <strong><%= @results[\"Get Project\"][\"Project Name\"] %></strong>.",
        ),
        paragraph(
          '<strong>Date:</strong> <%= @results["Get Project"]["Scheduled Date"] %><br><strong>Location:</strong> <%= @results["Get Project"]["City"] %>, <%= @results["Get Project"]["State"] %>',
        ),
        paragraph(
          "We'll follow up with more details as the project date approaches. If your availability changes, you can update your status in the portal.",
        ),
        action('View Project Details', '<%= @results["Get Project"]["Project URL"] %>'),
        divider(),
        paragraph(
          'Thank you for making a difference in your community!',
        ),
        paragraph(
          'The Waterboyz Team',
        ),
        spacer(),
      ].join('');

      return layout({
        subject: "You're Signed Up — Waterboyz",
        preheader: 'Thanks for volunteering!',
        body,
      });
    },
  },
};

// ── CLI ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const distDir = path.join(__dirname, 'dist');

if (args.includes('--list')) {
  console.log('Available templates:');
  Object.keys(templates).forEach(name => {
    console.log(`  ${name} — ${templates[name].subject}`);
  });
  process.exit(0);
}

const preview = args.indexOf('--preview');
const previewName = preview !== -1 ? args[preview + 1] : null;

const toBuild =
  args.length === 0 || preview !== -1
    ? Object.keys(templates)
    : args.filter(a => !a.startsWith('--'));

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

for (const name of toBuild) {
  if (!templates[name]) {
    console.error(`Unknown template: ${name}`);
    process.exit(1);
  }
  const html = templates[name].build();
  const outPath = path.join(distDir, `${name}.html`);
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`Built: dist/${name}.html`);
}

if (previewName) {
  const file = path.join(distDir, `${previewName}.html`);
  if (!fs.existsSync(file)) {
    console.error(`Template not found: ${previewName}`);
    process.exit(1);
  }
  console.log(`Opening preview for ${previewName}...`);
  try {
    execSync(`open "${file}"`);
  } catch {
    console.log(`Preview file: ${file}`);
  }
}
