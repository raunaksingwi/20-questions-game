import { assertEquals, assertExists, assertStringIncludes } from "jsr:@std/assert@1";
import { AIGuessingPromptBuilder } from './AIGuessingPromptBuilder.ts';

Deno.test("AIGuessingPromptBuilder - categorizeFacts", async (t) => {
  await t.step("should categorize facts correctly", () => {
    const questionsByNumber = {
      1: "Are they male?",
      2: "Are they from Europe?", 
      3: "Are they still alive?",
      4: "Did they serve before 1990?"
    };
    
    const answersByNumber = {
      1: "yes",
      2: "no", 
      3: "maybe",
      4: "don't know"
    };

    const facts = AIGuessingPromptBuilder.categorizeFacts(questionsByNumber, answersByNumber);
    
    assertEquals(facts.yesFacts.length, 1);
    assertEquals(facts.yesFacts[0].q, "Are they male?");
    
    assertEquals(facts.noFacts.length, 1);
    assertEquals(facts.noFacts[0].q, "Are they from Europe?");
    
    assertEquals(facts.maybeFacts.length, 1);
    assertEquals(facts.maybeFacts[0].q, "Are they still alive?");
    
    assertEquals(facts.unknownFacts.length, 1);
    assertEquals(facts.unknownFacts[0].q, "Did they serve before 1990?");
  });

  await t.step("should handle empty inputs", () => {
    const facts = AIGuessingPromptBuilder.categorizeFacts({}, {});
    
    assertEquals(facts.yesFacts.length, 0);
    assertEquals(facts.noFacts.length, 0);
    assertEquals(facts.maybeFacts.length, 0);
    assertEquals(facts.unknownFacts.length, 0);
  });

  await t.step("should recognize various yes/no variations", () => {
    const questionsByNumber = {
      1: "Question 1?",
      2: "Question 2?", 
      3: "Question 3?",
      4: "Question 4?",
      5: "Question 5?",
      6: "Question 6?"
    };
    
    const answersByNumber = {
      1: "yeah",
      2: "yep", 
      3: "nope",
      4: "sometimes",
      5: "it depends",
      6: "dont know"
    };

    const facts = AIGuessingPromptBuilder.categorizeFacts(questionsByNumber, answersByNumber);
    
    assertEquals(facts.yesFacts.length, 2); // yeah, yep
    assertEquals(facts.noFacts.length, 1); // nope
    assertEquals(facts.maybeFacts.length, 2); // sometimes, it depends
    assertEquals(facts.unknownFacts.length, 1); // dont know
  });
});

Deno.test("AIGuessingPromptBuilder - buildCategorizedSummary", async (t) => {
  await t.step("should build summary with all fact types", () => {
    const facts = {
      yesFacts: [{ n: 1, q: "Are they male?" }],
      noFacts: [{ n: 2, q: "Are they from Europe?" }],
      maybeFacts: [{ n: 3, q: "Are they still alive?" }],
      unknownFacts: [{ n: 4, q: "Did they serve before 1990?" }]
    };

    const summary = AIGuessingPromptBuilder.buildCategorizedSummary(facts);
    
    assertStringIncludes(summary, "ESTABLISHED FACTS");
    assertStringIncludes(summary, "✓ CONFIRMED TRUE");
    assertStringIncludes(summary, "Are they male?");
    assertStringIncludes(summary, "✗ CONFIRMED FALSE");
    assertStringIncludes(summary, "Are they from Europe?");
    assertStringIncludes(summary, "~ PARTIAL YES");
    assertStringIncludes(summary, "Are they still alive?");
    assertStringIncludes(summary, "? UNKNOWN");
    assertStringIncludes(summary, "Did they serve before 1990?");
  });

  await t.step("should handle empty facts", () => {
    const facts = {
      yesFacts: [],
      noFacts: [],
      maybeFacts: [],
      unknownFacts: []
    };

    const summary = AIGuessingPromptBuilder.buildCategorizedSummary(facts);
    
    assertStringIncludes(summary, "ESTABLISHED FACTS");
    // Should not include section headers if no facts
    assertEquals(summary.includes("✓ CONFIRMED TRUE"), false);
    assertEquals(summary.includes("✗ CONFIRMED FALSE"), false);
  });
});

Deno.test("AIGuessingPromptBuilder - buildLogicalDeductions", async (t) => {
  await t.step("should build objects category deductions", () => {
    const facts = {
      yesFacts: [{ n: 1, q: "Is it electronic?" }],
      noFacts: [{ n: 2, q: "Can you hold it in your hand?" }],
      maybeFacts: [],
      unknownFacts: []
    };

    const deductions = AIGuessingPromptBuilder.buildLogicalDeductions("objects", facts);
    
    assertStringIncludes(deductions, "💡 LOGICAL DEDUCTIONS");
    assertStringIncludes(deductions, "NOT living, NOT organic, NOT edible");
    assertStringIncludes(deductions, "large/heavy");
  });

  await t.step("should build world leaders category deductions", () => {
    const facts = {
      yesFacts: [{ n: 1, q: "Are they still alive?" }, { n: 2, q: "Are they male?" }],
      noFacts: [],
      maybeFacts: [],
      unknownFacts: []
    };

    const deductions = AIGuessingPromptBuilder.buildLogicalDeductions("world leaders", facts);
    
    assertStringIncludes(deductions, "💡 LOGICAL DEDUCTIONS");
    assertStringIncludes(deductions, "currently serving or recently served");
    assertStringIncludes(deductions, "NOT female");
  });

  await t.step("should build animals category deductions", () => {
    const facts = {
      yesFacts: [{ n: 1, q: "Is it a mammal?" }],
      noFacts: [{ n: 2, q: "Is it a wild animal?" }],
      maybeFacts: [],
      unknownFacts: []
    };

    const deductions = AIGuessingPromptBuilder.buildLogicalDeductions("animals", facts);
    
    assertStringIncludes(deductions, "💡 LOGICAL DEDUCTIONS");
    assertStringIncludes(deductions, "NOT a bird, reptile, fish, or insect");
    assertStringIncludes(deductions, "pet or farm animal");
  });

  await t.step("should return empty string for no facts", () => {
    const facts = {
      yesFacts: [],
      noFacts: [],
      maybeFacts: [],
      unknownFacts: []
    };

    const deductions = AIGuessingPromptBuilder.buildLogicalDeductions("objects", facts);
    assertEquals(deductions, "");
  });
});

Deno.test("AIGuessingPromptBuilder - buildRepetitionPrevention", async (t) => {
  await t.step("should build prevention section with questions", () => {
    const questions = ["Are they male?", "Are they from Europe?", "Are they still alive?"];
    
    const section = AIGuessingPromptBuilder.buildRepetitionPrevention(questions);
    
    assertStringIncludes(section, "🚫 ALREADY ASKED QUESTIONS");
    assertStringIncludes(section, "1. Are they male?");
    assertStringIncludes(section, "2. Are they from Europe?");
    assertStringIncludes(section, "3. Are they still alive?");
    assertStringIncludes(section, "CRITICAL: You must ask a NEW question");
  });

  await t.step("should return empty string for no questions", () => {
    const section = AIGuessingPromptBuilder.buildRepetitionPrevention([]);
    assertEquals(section, "");
  });
});

Deno.test("AIGuessingPromptBuilder - buildSpecialResponseHandling", async (t) => {
  await t.step("should detect recent unknown response", () => {
    const facts = {
      yesFacts: [],
      noFacts: [],
      maybeFacts: [],
      unknownFacts: [{ n: 5, q: "Did they serve before 1990?" }]
    };

    const section = AIGuessingPromptBuilder.buildSpecialResponseHandling(facts, 5);
    
    assertStringIncludes(section, "⚠️  UNKNOWN RESPONSE DETECTED");
    assertStringIncludes(section, "Don't know");
    assertStringIncludes(section, "PIVOT TO DIFFERENT TOPICS");
  });

  await t.step("should detect recent maybe response", () => {
    const facts = {
      yesFacts: [],
      noFacts: [],
      maybeFacts: [{ n: 4, q: "Are they still alive?" }],
      unknownFacts: []
    };

    const section = AIGuessingPromptBuilder.buildSpecialResponseHandling(facts, 5);
    
    assertStringIncludes(section, "📍 PARTIAL YES RESPONSE DETECTED");
    assertStringIncludes(section, "Sometimes/Maybe");
    assertStringIncludes(section, "BUILD ON PARTIAL CONFIRMATION");
  });

  await t.step("should return empty for no recent special responses", () => {
    const facts = {
      yesFacts: [],
      noFacts: [],
      maybeFacts: [],
      unknownFacts: []
    };

    const section = AIGuessingPromptBuilder.buildSpecialResponseHandling(facts, 5);
    assertEquals(section, "");
  });
});

Deno.test("AIGuessingPromptBuilder - buildEnhancedSystemPrompt", async (t) => {
  await t.step("should build complete enhanced prompt", () => {
    const basePrompt = "You are playing 20 Questions.";
    const facts = {
      yesFacts: [{ n: 1, q: "Are they male?" }],
      noFacts: [{ n: 2, q: "Are they from Europe?" }],
      maybeFacts: [],
      unknownFacts: []
    };
    const allAskedQuestions = ["Are they male?", "Are they from Europe?"];
    
    const enhancedPrompt = AIGuessingPromptBuilder.buildEnhancedSystemPrompt(
      basePrompt,
      "world leaders",
      facts,
      allAskedQuestions,
      2
    );
    
    assertStringIncludes(enhancedPrompt, basePrompt);
    assertStringIncludes(enhancedPrompt, "ESTABLISHED FACTS");
    assertStringIncludes(enhancedPrompt, "💡 LOGICAL DEDUCTIONS");
    assertStringIncludes(enhancedPrompt, "🚫 ALREADY ASKED QUESTIONS");
    assertStringIncludes(enhancedPrompt, "NEVER ASK VAGUE QUESTIONS");
    assertStringIncludes(enhancedPrompt, "ALWAYS ASK CONCRETE, SPECIFIC QUESTIONS");
  });

  await t.step("should include suggested question when provided", () => {
    const basePrompt = "Base prompt";
    const facts = { yesFacts: [], noFacts: [], maybeFacts: [], unknownFacts: [] };
    const suggestedQuestion = "Are they from Asia?";
    
    const enhancedPrompt = AIGuessingPromptBuilder.buildEnhancedSystemPrompt(
      basePrompt,
      "world leaders",
      facts,
      [],
      1,
      suggestedQuestion
    );
    
    assertStringIncludes(enhancedPrompt, "RECOMMENDED QUESTION");
    assertStringIncludes(enhancedPrompt, suggestedQuestion);
    assertStringIncludes(enhancedPrompt, "decision tree analysis");
  });
});