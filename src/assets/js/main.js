document.addEventListener("DOMContentLoaded", function() {
	const links = document.querySelectorAll('.nav__link');
	links.forEach(link => {
		const href = link.getAttribute('href');
		if (href && href !== '/' && window.location.pathname.startsWith(href)) {
			link.classList.add('is-active');
		}
	});
});

