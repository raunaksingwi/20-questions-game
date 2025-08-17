import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";
import { AIQuestioningTemplateFactory, WorldLeadersAIQuestioningTemplate, ObjectsAIQuestioningTemplate, AnimalsAIQuestioningTemplate } from './AIQuestioningTemplate.ts';

Deno.test("AIQuestioningTemplateFactory", async (t) => {
  await t.step("should create correct template for world leaders", () => {
    const template = AIQuestioningTemplateFactory.createTemplate('world leaders');
    assertEquals(template instanceof WorldLeadersAIQuestioningTemplate, true);
  });

  await t.step("should create correct template for objects", () => {
    const template = AIQuestioningTemplateFactory.createTemplate('objects');
    assertEquals(template instanceof ObjectsAIQuestioningTemplate, true);
  });

  await t.step("should create correct template for animals", () => {
    const template = AIQuestioningTemplateFactory.createTemplate('animals');
    assertEquals(template instanceof AnimalsAIQuestioningTemplate, true);
  });

  await t.step("should create default template for unknown category", () => {
    const template = AIQuestioningTemplateFactory.createTemplate('unknown-category');
    // Should not be one of the specific templates
    assertEquals(template instanceof WorldLeadersAIQuestioningTemplate, false);
    assertEquals(template instanceof ObjectsAIQuestioningTemplate, false);
    assertEquals(template instanceof AnimalsAIQuestioningTemplate, false);
  });

  await t.step("should load only category-specific content for each category", () => {
    const categories = [
      { name: 'world leaders', shouldInclude: ['Are they still alive?', 'Are they from Europe'], shouldExclude: ['Is it electronic?', 'Is it a mammal?'] },
      { name: 'objects', shouldInclude: ['Is it electronic?', 'Can you hold it'], shouldExclude: ['Are they still alive?', 'Is it a mammal?'] },
      { name: 'animals', shouldInclude: ['Is it a mammal?', 'Is it a wild animal'], shouldExclude: ['Are they still alive?', 'Is it electronic?'] }
    ];

    categories.forEach(({ name, shouldInclude, shouldExclude }) => {
      const template = AIQuestioningTemplateFactory.createTemplate(name);
      const prompt = template.generate(0, "", []);

      // Verify category-specific content is included
      shouldInclude.forEach(content => {
        assertStringIncludes(prompt, content, `${name} template should include: ${content}`);
      });

      // Verify other category content is excluded
      shouldExclude.forEach(content => {
        assertEquals(prompt.includes(content), false, `${name} template should NOT include: ${content}`);
      });
    });
  });

  await t.step("should ensure complete category isolation", () => {
    // Test all available categories to ensure no cross-contamination
    const allCategories = ['world leaders', 'objects', 'animals', 'cricket players', 'football players', 'nba players'];
    
    allCategories.forEach(categoryA => {
      const templateA = AIQuestioningTemplateFactory.createTemplate(categoryA);
      const promptA = templateA.generate(0, "", []);
      
      allCategories.forEach(categoryB => {
        if (categoryA !== categoryB) {
          const templateB = AIQuestioningTemplateFactory.createTemplate(categoryB);
          const promptB = templateB.generate(0, "", []);
          
          // Get category-specific headers to ensure they don't cross-contaminate
          const categoryHeaderA = `${categoryA.toUpperCase().replace(/ /g, ' ')} CATEGORY - LOGICAL DEDUCTIONS`;
          const categoryHeaderB = `${categoryB.toUpperCase().replace(/ /g, ' ')} CATEGORY - LOGICAL DEDUCTIONS`;
          
          assertEquals(
            promptA.includes(categoryHeaderB), 
            false, 
            `${categoryA} template should NOT contain ${categoryB} deductions header`
          );
        }
      });
    });
  });
});

Deno.test("WorldLeadersAIQuestioningTemplate", async (t) => {
  await t.step("should generate world leaders specific prompt", () => {
    const template = new WorldLeadersAIQuestioningTemplate();
    const prompt = template.generate(2, "Q1: Are they male?\nA1: Yes\nQ2: Are they alive?\nA2: No", ["Are they male?", "Are they alive?"]);
    
    assertStringIncludes(prompt, "World Leaders");
    assertStringIncludes(prompt, "WORLD LEADERS CATEGORY - LOGICAL DEDUCTIONS");
    assertStringIncludes(prompt, "alive");
    assertStringIncludes(prompt, "male");
    assertStringIncludes(prompt, "historical figures");
    assertStringIncludes(prompt, "NOT female");
  });

  await t.step("should include category-specific strategic questions in prompt", () => {
    const template = new WorldLeadersAIQuestioningTemplate();
    const prompt = template.generate(0, "", []);
    
    // Should contain world leader specific strategic guidance
    assertStringIncludes(prompt, "Are they still alive?");
    assertStringIncludes(prompt, "Are they from Europe");
    assertStringIncludes(prompt, "Were they a president");
  });

  await t.step("should NOT include other category content", () => {
    const template = new WorldLeadersAIQuestioningTemplate();
    const prompt = template.generate(0, "", []);
    
    // Should NOT contain objects-specific content
    assertEquals(prompt.includes("Is it electronic?"), false);
    assertEquals(prompt.includes("Can you hold it in one hand?"), false);
    assertEquals(prompt.includes("Is it found in a kitchen?"), false);
    
    // Should NOT contain animals-specific content
    assertEquals(prompt.includes("Is it a mammal?"), false);
    assertEquals(prompt.includes("Does it eat meat?"), false);
    assertEquals(prompt.includes("Is it a wild animal?"), false);
  });
});

Deno.test("ObjectsAIQuestioningTemplate", async (t) => {
  await t.step("should generate objects specific prompt", () => {
    const template = new ObjectsAIQuestioningTemplate();
    const prompt = template.generate(1, "Q1: Is it electronic?\nA1: Yes", ["Is it electronic?"]);
    
    assertStringIncludes(prompt, "Objects");
    assertStringIncludes(prompt, "OBJECTS CATEGORY - LOGICAL DEDUCTIONS");
    assertStringIncludes(prompt, "electronic");
    assertStringIncludes(prompt, "NOT living, NOT organic, NOT edible");
  });

  await t.step("should include objects-specific strategic questions in prompt", () => {
    const template = new ObjectsAIQuestioningTemplate();
    const prompt = template.generate(0, "", []);
    
    // Should contain objects specific strategic guidance
    assertStringIncludes(prompt, "Can you hold it in one hand?");
    assertStringIncludes(prompt, "Is it electronic?");
    assertStringIncludes(prompt, "Is it found in a kitchen?");
  });

  await t.step("should NOT include other category content", () => {
    const template = new ObjectsAIQuestioningTemplate();
    const prompt = template.generate(0, "", []);
    
    // Should NOT contain world leaders-specific content
    assertEquals(prompt.includes("Are they still alive?"), false);
    assertEquals(prompt.includes("Are they from Europe?"), false);
    assertEquals(prompt.includes("Were they a president?"), false);
    
    // Should NOT contain animals-specific content
    assertEquals(prompt.includes("Is it a mammal?"), false);
    assertEquals(prompt.includes("Does it eat meat?"), false);
    assertEquals(prompt.includes("Is it a wild animal?"), false);
  });
});

Deno.test("AnimalsAIQuestioningTemplate", async (t) => {
  await t.step("should generate animals specific prompt", () => {
    const template = new AnimalsAIQuestioningTemplate();
    const prompt = template.generate(2, "Q1: Is it a mammal?\nA1: Yes\nQ2: Is it wild?\nA2: No", ["Is it a mammal?", "Is it wild?"]);
    
    assertStringIncludes(prompt, "Animals");
    assertStringIncludes(prompt, "ANIMALS CATEGORY - LOGICAL DEDUCTIONS");
    assertStringIncludes(prompt, "mammal");
    assertStringIncludes(prompt, "NOT a bird, reptile, fish, or insect");
    assertStringIncludes(prompt, "pet or farm animal");
  });

  await t.step("should include animals-specific strategic questions in prompt", () => {
    const template = new AnimalsAIQuestioningTemplate();
    const prompt = template.generate(0, "", []);
    
    // Should contain animals specific strategic guidance
    assertStringIncludes(prompt, "Is it a mammal?");
    assertStringIncludes(prompt, "Is it a wild animal?");
    assertStringIncludes(prompt, "Does it eat meat?");
  });

  await t.step("should NOT include other category content", () => {
    const template = new AnimalsAIQuestioningTemplate();
    const prompt = template.generate(0, "", []);
    
    // Should NOT contain world leaders-specific content
    assertEquals(prompt.includes("Are they still alive?"), false);
    assertEquals(prompt.includes("Are they from Europe?"), false);
    assertEquals(prompt.includes("Were they a president?"), false);
    
    // Should NOT contain objects-specific content
    assertEquals(prompt.includes("Is it electronic?"), false);
    assertEquals(prompt.includes("Can you hold it in one hand?"), false);
    assertEquals(prompt.includes("Is it found in a kitchen?"), false);
  });
});