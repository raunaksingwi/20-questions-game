import { assertEquals, assertExists, assert } from "jsr:@std/assert@1";
import { DecisionTree } from './DecisionTree.ts';

Deno.test("DecisionTree - analyzeConversationState", async (t) => {
  await t.step("should analyze world leaders conversation state", () => {
    const conversationHistory = [
      { question: "Are they from Europe?", answer: "yes" }
    ];
    const remainingItems = ["Winston Churchill", "Angela Merkel", "Napoleon Bonaparte"];
    
    const analysis = DecisionTree.analyzeConversationState(
      "world leaders", 
      conversationHistory, 
      remainingItems
    );
    
    assertExists(analysis);
    assertEquals(typeof analysis.shouldEnterGuessingPhase, "boolean");
    assertExists(analysis.possibilitySpace);
    assertExists(analysis.facts);
    assertEquals(analysis.questionCount, 1);
    assertEquals(analysis.possibilitySpace.category, "world leaders");
  });

  await t.step("should analyze animals conversation state", () => {
    const conversationHistory = [
      { question: "Is it a mammal?", answer: "no" }
    ];
    const remainingItems = ["eagle", "shark", "snake", "goldfish"];
    
    const analysis = DecisionTree.analyzeConversationState(
      "animals", 
      conversationHistory, 
      remainingItems
    );
    
    assertExists(analysis);
    assertEquals(typeof analysis.shouldEnterGuessingPhase, "boolean");
    assertExists(analysis.possibilitySpace);
    assertEquals(analysis.questionCount, 1);
  });

  await t.step("should recommend guessing when only one item remains", () => {
    const conversationHistory = [
      { question: "Are they from Europe?", answer: "yes" },
      { question: "Are they British?", answer: "yes" }
    ];
    const remainingItems = ["Winston Churchill"];
    
    const analysis = DecisionTree.analyzeConversationState(
      "world leaders", 
      conversationHistory, 
      remainingItems
    );
    
    assertEquals(analysis.shouldEnterGuessingPhase, true);
    assertEquals(analysis.possibilitySpace.remaining.length, 1);
  });

  await t.step("should track confirmed facts properly", () => {
    const conversationHistory = [
      { question: "Are they from Europe?", answer: "yes" },
      { question: "Are they male?", answer: "yes" }
    ];
    const remainingItems = ["Winston Churchill", "Napoleon Bonaparte", "Julius Caesar"];
    
    const analysis = DecisionTree.analyzeConversationState(
      "world leaders", 
      conversationHistory, 
      remainingItems
    );
    
    assertExists(analysis.facts.confirmedYes);
    assert(analysis.facts.confirmedYes.has("are they from europe?"));
    assert(analysis.facts.confirmedYes.has("are they male?"));
  });

  await t.step("should handle don't know responses properly", () => {
    const conversationHistory = [
      { question: "Are they from Europe?", answer: "don't know" },
      { question: "Are they male?", answer: "yes" }
    ];
    const remainingItems = ["Winston Churchill", "George Washington", "Abraham Lincoln"];
    
    const analysis = DecisionTree.analyzeConversationState(
      "world leaders", 
      conversationHistory, 
      remainingItems
    );
    
    assertExists(analysis.facts.uncertainQuestions);
    assert(analysis.facts.uncertainQuestions.has("are they from europe?"));
    assert(analysis.facts.confirmedYes.has("are they male?"));
  });

  await t.step("should handle empty conversation history", () => {
    const conversationHistory: Array<{question: string, answer: string}> = [];
    const remainingItems = ["Winston Churchill", "Napoleon Bonaparte", "Gandhi"];
    
    const analysis = DecisionTree.analyzeConversationState(
      "world leaders", 
      conversationHistory, 
      remainingItems
    );
    
    assertExists(analysis);
    assertEquals(analysis.questionCount, 0);
    assertEquals(analysis.shouldEnterGuessingPhase, false); // Should not guess immediately with no questions
  });

  await t.step("should provide analytical insights", () => {
    const conversationHistory = [
      { question: "Are they from Europe?", answer: "yes" }
    ];
    const remainingItems = ["Winston Churchill", "Angela Merkel", "Napoleon Bonaparte"];
    
    const analysis = DecisionTree.analyzeConversationState(
      "world leaders", 
      conversationHistory, 
      remainingItems
    );
    
    assertExists(analysis.insights);
    assertEquals(typeof analysis.insights.remainingCount, "number");
    assertEquals(Array.isArray(analysis.insights.topCandidates), true);
    assertEquals(Array.isArray(analysis.insights.suggestedFocus), true);
  });

  await t.step("should recommend guessing phase when appropriate", () => {
    const conversationHistory = [
      { question: "Are they from Europe?", answer: "yes" },
      { question: "Are they British?", answer: "yes" }
    ];
    const remainingItems = ["Winston Churchill"];
    
    const analysis = DecisionTree.analyzeConversationState(
      "world leaders", 
      conversationHistory, 
      remainingItems
    );
    
    assertEquals(analysis.shouldEnterGuessingPhase, true);
    assertEquals(analysis.insights.topCandidates.length > 0, true);
  });
});