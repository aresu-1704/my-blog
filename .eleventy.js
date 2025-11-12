module.exports = function(eleventyConfig) {
	eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

	const pathPrefix = process.env.PATH_PREFIX || "/";

	return {
		dir: {
			input: "src",
			includes: "_includes",
			data: "_data",
			output: "_site"
		},
		templateFormats: ["njk", "md", "html"],
		htmlTemplateEngine: "njk",
		markdownTemplateEngine: "njk",
		pathPrefix
	};
};

