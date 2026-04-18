// ==UserScript==
// @name         Scotiabank: Reverse Transaction Order
// @namespace    https://andrewe.ca
// @version      9.0
// @description  Adds a clickable Date column header to toggle transaction sort order between ascending and descending.
// @author       Andrew Escobar (andrewe.ca)
// @match        https://secure.scotiabank.com/accounts/*
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/andesco/userscripts-banks/main/scotiabank-reverse-transaction-order.user.js
// @downloadURL  https://raw.githubusercontent.com/andesco/userscripts-banks/main/scotiabank-reverse-transaction-order.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Track the current sort state
    let sortState = {
        isReversed: false, // false = ascending (oldest first), true = descending (newest first)
        initialized: false
    };

    // Function to reverse transaction rows by manipulating the DOM
    function reverseTransactionRows() {
        // Find the main transaction table tbody
        const tbody = document.querySelector('tbody.TableBodystyle__StyledTbody-canvas-core__sc-iq7avh-0');

        if (!tbody) {
            console.log('[Scotiabank] Transaction tbody not found');
            return false;
        }

        // Get all transaction rows (tr elements with role="row")
        const rows = Array.from(tbody.querySelectorAll('tr[role="row"]'));

        if (rows.length === 0) {
            console.log('[Scotiabank] No transaction rows found');
            return false;
        }

        console.log(`[Scotiabank] Found ${rows.length} transaction rows. Reversing order...`);

        // Reverse the array
        rows.reverse();

        // Remove all rows from tbody
        rows.forEach(row => {
            row.remove();
        });

        // Re-insert rows in reversed order
        rows.forEach(row => {
            tbody.appendChild(row);
        });

        console.log('[Scotiabank] Transaction order reversed successfully');
        return true;
    }

    // Function to update the chevron icon based on sort state
    function updateChevronIcon() {
        const dateHeader = document.querySelector('th .transaction__date-header');
        if (!dateHeader) return;

        const th = dateHeader.closest('th');
        if (!th) return;

        // Remove existing chevron if present
        const existingChevron = th.querySelector('.sort-chevron');
        if (existingChevron) {
            existingChevron.remove();
        }

        // Create SVG chevron icon
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('iconType', 'functional');
        svg.setAttribute('class', 'SvgIconstyle__Wrapper-canvas-core__sc-15g7y6h-0 bSCSDj SvgIcon__icon sort-chevron');
        svg.setAttribute('focusable', 'false');
        svg.setAttribute('role', 'presentation');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('viewBox', '0 0 30 30');
        svg.setAttribute('size', '18');
        svg.setAttribute('color', 'currentColor');
        svg.style.marginLeft = '0.4rem';
        svg.style.display = 'inline-block';
        svg.style.verticalAlign = 'middle';
        svg.style.width = '18px';
        svg.style.height = '18px';
        svg.title = sortState.isReversed ? 'Newest first' : 'Oldest first';

        // Create path element
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');

        // Chevron up (pointing up) for descending (newest first), down (pointing down) for ascending (oldest first)
        if (sortState.isReversed) {
            // Pointing up: M28.5 21.7499L15 8.24991L1.5 21.7499
            path.setAttribute('d', 'M28.5 21.7499L15 8.24991L1.5 21.7499');
        } else {
            // Pointing down: M28.5 8.24991L15 21.7499L1.5 8.24991
            path.setAttribute('d', 'M28.5 8.24991L15 21.7499L1.5 8.24991');
        }

        svg.appendChild(path);
        dateHeader.appendChild(svg);
    }

    // Function to make the Date header clickable
    function makeDateHeaderClickable() {
        const dateHeader = document.querySelector('th .transaction__date-header');
        if (!dateHeader) {
            console.log('[Scotiabank] Date header not found');
            return false;
        }

        const th = dateHeader.closest('th');
        if (!th) {
            console.log('[Scotiabank] Date th element not found');
            return false;
        }

        // Check if already set up
        if (th.hasAttribute('data-sortable')) {
            console.log('[Scotiabank] Date header already set up');
            return true;
        }

        // Make the th clickable
        th.style.cursor = 'pointer';
        th.style.userSelect = 'none';
        th.setAttribute('data-sortable', 'true');

        // Add click handler
        th.addEventListener('click', () => {
            console.log('[Scotiabank] Date header clicked');

            // Toggle sort state
            sortState.isReversed = !sortState.isReversed;

            // Reverse the rows
            reverseTransactionRows();

            // Update chevron
            updateChevronIcon();

            console.log(`[Scotiabank] Sort state toggled to: ${sortState.isReversed ? 'descending' : 'ascending'}`);
        });

        // Add hover effect
        th.addEventListener('mouseenter', () => {
            th.style.backgroundColor = 'rgba(0, 157, 214, 0.05)';
        });

        th.addEventListener('mouseleave', () => {
            th.style.backgroundColor = '';
        });

        console.log('[Scotiabank] Date header made clickable');
        return true;
    }

    // Function to set up a MutationObserver to watch for new rows being added
    function setupMutationObserver() {
        const tbody = document.querySelector('tbody.TableBodystyle__StyledTbody-canvas-core__sc-iq7avh-0');

        if (!tbody) {
            console.log('[Scotiabank] Cannot setup observer - tbody not found');
            return;
        }

        const observer = new MutationObserver((mutations) => {
            // Check if rows were added or modified
            let shouldUpdateHeader = false;

            for (const mutation of mutations) {
                // Check for added nodes
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1 && node.tagName === 'TR' && node.getAttribute('role') === 'row') {
                            shouldUpdateHeader = true;
                            break;
                        }
                    }
                }

                // Check for character data changes (content updates)
                if (mutation.type === 'characterData') {
                    shouldUpdateHeader = true;
                }

                if (shouldUpdateHeader) break;
            }

            if (shouldUpdateHeader) {
                console.log('[Scotiabank] Transaction data detected, updating header...');
                // Add a small delay to ensure all data is loaded
                setTimeout(() => {
                    // Make sure header is clickable
                    if (makeDateHeaderClickable()) {
                        // If not yet initialized, reverse rows and set up chevron
                        if (!sortState.initialized) {
                            reverseTransactionRows();
                            sortState.isReversed = true;
                            updateChevronIcon();
                            sortState.initialized = true;
                        } else {
                            // Just update chevron if already initialized
                            updateChevronIcon();
                        }
                    }
                }, 100);
            }
        });

        // Watch for child additions/removals and text content changes
        observer.observe(tbody, {
            childList: true,
            subtree: true,
            characterData: true
        });

        console.log('[Scotiabank] MutationObserver setup complete');
    }

    // Initial attempt on page load - wait 3 seconds for transaction data to load
    window.addEventListener('load', () => {
        console.log('[Scotiabank] Page load event fired');
        setTimeout(() => {
            if (makeDateHeaderClickable()) {
                reverseTransactionRows();
                sortState.isReversed = true;
                updateChevronIcon();
                sortState.initialized = true;
                setupMutationObserver();
            }
        }, 3000);
    });

    // Also try after 3 seconds in case page is already loaded
    setTimeout(() => {
        console.log('[Scotiabank] Initial check at 3 seconds');
        if (makeDateHeaderClickable()) {
            reverseTransactionRows();
            sortState.isReversed = true;
            updateChevronIcon();
            sortState.initialized = true;
            setupMutationObserver();
        }
    }, 3000);

    // Keep trying for a bit in case content loads dynamically
    let attempts = 0;
    const maxAttempts = 30;
    const checkInterval = setInterval(() => {
        attempts++;
        console.log(`[Scotiabank] Attempt ${attempts}/${maxAttempts}`);

        if (makeDateHeaderClickable()) {
            if (!sortState.initialized) {
                reverseTransactionRows();
                sortState.isReversed = true;
                updateChevronIcon();
                sortState.initialized = true;
            }
            setupMutationObserver();
            clearInterval(checkInterval);
        } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            console.log('[Scotiabank] Could not find transaction table after multiple attempts');
        }
    }, 300);
})();
