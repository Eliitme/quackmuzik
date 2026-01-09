/**
 * Master Layout Loader
 * Loads common header and footer into all pages
 */

(function() {
  'use strict';

  // Header HTML template
  const headerHTML = `
    <header>
      <div class="header-container">
        <div class="header-content">
          <a href="index.html" class="logo">
            <span class="logo-icon">🦆</span>
            <span>QuackMuzik</span>
          </a>
          <button class="menu-toggle">☰</button>
          <nav>
            <ul>
              <li><a href="index.html" data-i18n="nav.home">Trang chủ</a></li>
              <li><a href="guide.html" data-i18n="nav.guide">Hướng dẫn</a></li>
              <li><a href="terms.html" data-i18n="nav.terms">Điều khoản</a></li>
              <li><a href="disclaimer.html" data-i18n="nav.disclaimer">Tuyên bố</a></li>
              <li><a href="license.html" data-i18n="nav.license">Giấy phép</a></li>
            </ul>
            <div class="language-switcher">
              <button class="lang-btn" data-lang="vi" onclick="window.i18n.changeLanguage('vi')">VI</button>
              <button class="lang-btn" data-lang="en" onclick="window.i18n.changeLanguage('en')">EN</button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  `;

  // Footer HTML template
  const footerHTML = `
    <footer>
      <p data-i18n="common.footer">© 2026 QuackMuzik. All rights reserved.</p>
      <p>
        <a href="terms.html" data-i18n="nav.terms">Điều khoản</a> |
        <a href="disclaimer.html" data-i18n="nav.disclaimer">Tuyên bố</a> |
        <a href="license.html" data-i18n="nav.license">Giấy phép</a>
      </p>
    </footer>
  `;

  // Load header
  function loadHeader() {
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
      headerPlaceholder.outerHTML = headerHTML;
    } else {
      // If no placeholder, insert at the beginning of body
      document.body.insertAdjacentHTML('afterbegin', headerHTML);
    }
  }

  // Load footer
  function loadFooter() {
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
      footerPlaceholder.outerHTML = footerHTML;
    } else {
      // If no placeholder, insert at the end of body
      document.body.insertAdjacentHTML('beforeend', footerHTML);
    }
  }

  // Initialize layout when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      loadHeader();
      loadFooter();
    });
  } else {
    // DOM already loaded
    loadHeader();
    loadFooter();
  }

  // Update active navigation link based on current page
  function updateActiveNav() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('nav a');

    navLinks.forEach(link => {
      const linkPage = link.getAttribute('href');
      if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // Update active nav after layout is loaded
  setTimeout(updateActiveNav, 100);
})();

