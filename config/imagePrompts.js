/**
 * Template-style prompts for generating professional demos
 * Two presets: "storefront" (clean template) and "stylized" (UI concept)
 */

export const occupationPrompts = {
  bakery: {
    presets: {
      storefront: {
        prompt: "Template-style storefront hero banner for an artisan bakery, clean layout, neutral palette, professional website design",
        description: "Welcome to {{company_name}}—freshly baked goodness baked daily just for you!"
      },
      stylized: {
        prompt: "UI concept hero banner with heart-shaped artisan loaf on pastel background, stylish, minimal, modern web design",
        description: "Indulge in artisan bread crafted with love at {{company_name}}."
      }
    }
  },
  
  plumbing: {
    presets: {
      storefront: {
        prompt: "Template-style storefront hero banner for a professional plumbing service, clean layout, neutral palette, trustworthy design",
        description: "Your neighborhood plumbing experts—fast, reliable service when you need it!"
      },
      stylized: {
        prompt: "UI concept hero banner with modern plumbing tools on clean background, professional, sleek web design",
        description: "Professional plumbing solutions for {{company_name}}—we fix it right the first time."
      }
    }
  },
  
  landscaping: {
    presets: {
      storefront: {
        prompt: "Template-style storefront hero banner for a premium landscaping company, clean layout, neutral palette, nature-inspired",
        description: "Transforming outdoor spaces into lush, vibrant landscapes."
      },
      stylized: {
        prompt: "UI concept hero banner with geometric garden elements on gradient background, modern, eco-friendly design",
        description: "Creating beautiful outdoor environments at {{company_name}}—where nature meets design."
      }
    }
  },
  
  dental: {
    presets: {
      storefront: {
        prompt: "Template-style storefront hero banner for a modern dental practice, clean layout, neutral palette, medical professional",
        description: "Gentle, comprehensive dental care for the whole family at {{company_name}}."
      },
      stylized: {
        prompt: "UI concept hero banner with minimalist dental icons on soft blue background, modern healthcare design",
        description: "Your smile is our priority—expert dental care at {{company_name}}."
      }
    }
  },
  
  restaurant: {
    presets: {
      storefront: {
        prompt: "Template-style storefront hero banner for a family restaurant, clean layout, neutral palette, warm and inviting",
        description: "Delicious homestyle cooking made with love at {{company_name}}."
      },
      stylized: {
        prompt: "UI concept hero banner with elegant food photography on warm background, upscale dining design",
        description: "Experience exceptional dining at {{company_name}}—where every meal is memorable."
      }
    }
  },
  
  automotive: {
    presets: {
      storefront: {
        prompt: "Template-style storefront hero banner for an auto repair shop, clean layout, neutral palette, professional mechanic",
        description: "Expert auto repair and maintenance services at {{company_name}}."
      },
      stylized: {
        prompt: "UI concept hero banner with modern car silhouette on dynamic background, automotive service design",
        description: "Keep your car running smoothly with professional service from {{company_name}}."
      }
    }
  },
  
  salon: {
    presets: {
      storefront: {
        prompt: "Template-style storefront hero banner for a modern hair salon, clean layout, neutral palette, beauty and wellness",
        description: "Professional hair styling and beauty services at {{company_name}}."
      },
      stylized: {
        prompt: "UI concept hero banner with elegant beauty elements on sophisticated background, luxury salon design",
        description: "Discover your perfect look at {{company_name}}—where beauty meets expertise."
      }
    }
  },
  
  fitness: {
    presets: {
      storefront: {
        prompt: "Template-style storefront hero banner for a fitness gym, clean layout, neutral palette, health and wellness",
        description: "Achieve your fitness goals with expert training at {{company_name}}."
      },
      stylized: {
        prompt: "UI concept hero banner with dynamic fitness elements on energetic background, modern gym design",
        description: "Transform your health at {{company_name}}—where fitness meets results."
      }
    }
  },
  
  // Default for unrecognized occupations
  general: {
    presets: {
      storefront: {
        prompt: "Template-style storefront hero banner for a professional business, clean layout, neutral palette, trustworthy design",
        description: "Professional services from {{company_name}}—your trusted local business."
      },
      stylized: {
        prompt: "UI concept hero banner with modern business elements on clean background, professional web design",
        description: "Quality service and exceptional results from {{company_name}}."
      }
    }
  }
};

// Helper function to get prompts for a business
export function getPromptsForBusiness(industry, style = null) {
  const businessKey = industry ? industry.toLowerCase() : 'general';
  const config = occupationPrompts[businessKey] || occupationPrompts.general;
  
  if (style && config.presets[style]) {
    return config.presets[style];
  }
  
  // Default to storefront style
  return config.presets.storefront;
}

// Get both styles for comparison
export function getBothStyles(industry) {
  const businessKey = industry ? industry.toLowerCase() : 'general';
  const config = occupationPrompts[businessKey] || occupationPrompts.general;
  return config.presets;
} 