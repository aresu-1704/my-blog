// Client-side search functionality for Hugo blog
// No external libraries required - pure vanilla JavaScript

(function() {
    'use strict';
    
    // Get search input and posts container
    const searchInput = document.getElementById('search-input');
    const postsContainer = document.getElementById('posts-container');
    const resultCount = document.getElementById('search-result-count');
    
    // Exit if elements don't exist (not on a page with search)
    if (!searchInput || !postsContainer) {
        return;
    }
    
    // Get all post items
    const posts = postsContainer.querySelectorAll('.post-item');
    const totalPosts = posts.length;
    
    // Search function
    function searchPosts() {
        const keyword = searchInput.value.toLowerCase().trim();
        let visibleCount = 0;
        
        posts.forEach(function(post) {
            // Get post title
            const titleElement = post.querySelector('h2 a');
            const title = titleElement ? titleElement.textContent.toLowerCase() : '';
            
            // Get post description
            const descElement = post.querySelector('p');
            const description = descElement ? descElement.textContent.toLowerCase() : '';
            
            // Check if keyword matches title or description
            const matchesTitle = title.includes(keyword);
            const matchesDescription = description.includes(keyword);
            
            if (keyword === '' || matchesTitle || matchesDescription) {
                // Show post
                post.style.display = 'block';
                visibleCount++;
                
                // Add fade-in animation
                post.style.animation = 'fadeIn 0.3s ease-in';
            } else {
                // Hide post
                post.style.display = 'none';
            }
        });
        
        // Update result count
        if (keyword === '') {
            resultCount.textContent = '';
        } else if (visibleCount === 0) {
            resultCount.textContent = 'Không tìm thấy bài viết nào';
            resultCount.className = 'text-sm text-red-600 mt-2';
        } else {
            resultCount.textContent = `Tìm thấy ${visibleCount} / ${totalPosts} bài viết`;
            resultCount.className = 'text-sm text-green-600 mt-2';
        }
    }
    
    // Add event listener
    searchInput.addEventListener('keyup', searchPosts);
    searchInput.addEventListener('search', searchPosts); // For clear button in search input
    
    // Add CSS for fade-in animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
    
    console.log('Search functionality initialized. Total posts:', totalPosts);
})();
