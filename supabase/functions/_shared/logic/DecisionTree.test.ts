import { assertEquals, assertExists, assertStringIncludes } from "jsr:@std/assert@1";
import { DecisionTree } from './DecisionTree.ts';

Deno.test("DecisionTree - generateOptimalQuestion", async (t) => {
  await t.step("should generate question for world leaders category", () => {
    const conversationHistory = [
      { question: "Are they from Europe?", answer: "yes" }
    ];
    const remainingItems = ["Winston Churchill", "Angela Merkel", "Napoleon Bonaparte"];
    
    const question = DecisionTree.generateOptimalQuestion(
      "world leaders", 
      conversationHistory, 
      remainingItems
    );
    
    assertExists(question);
    assertEquals(typeof question, "string");
    assertStringIncludes(question.toLowerCase(), "?");
  });

  await t.step("should generate question for animals category", () => {
    const conversationHistory = [
      { question: "Is it a mammal?", answer: "no" }
    ];
    const remainingItems = ["eagle", "shark", "snake", "goldfish"];
    
    const question = DecisionTree.generateOptimalQuestion(
      "animals", 
      conversationHistory, 
      remainingItems
    );
    
    assertExists(question);
    assertEquals(typeof question, "string");
    assertStringIncludes(question.toLowerCase(), "?");
  });

  await t.step("should generate question for objects category", () => {
    const conversationHistory = [
      { question: "Is it electronic?", answer: "yes" }
    ];
    const remainingItems = ["smartphone", "laptop", "television", "radio"];
    
    const question = DecisionTree.generateOptimalQuestion(
      "objects", 
      conversationHistory, 
      remainingItems
    );
    
    assertExists(question);
    assertEquals(typeof question, "string");
    assertStringIncludes(question.toLowerCase(), "?");
  });

  await t.step("should make specific guess when few items remain", () => {
    const conversationHistory = [
      { question: "Are they from Europe?", answer: "yes" },
      { question: "Are they British?", answer: "yes" }
    ];
    const remainingItems = ["Winston Churchill"];
    
    const question = DecisionTree.generateOptimalQuestion(
      "world leaders", 
      conversationHistory, 
      remainingItems
    );
    
    assertExists(question);
    assertStringIncludes(question.toLowerCase(), "winston churchill");
  });

  await t.step("should avoid asking already asked questions", () => {
    const conversationHistory = [
      { question: "Are they from Europe?", answer: "yes" },
      { question: "Are they male?", answer: "yes" }
    ];
    const remainingItems = ["Winston Churchill", "Napoleon Bonaparte", "Julius Caesar"];
    
    const question = DecisionTree.generateOptimalQuestion(
      "world leaders", 
      conversationHistory, 
      remainingItems
    );
    
    assertExists(question);
    // Should not repeat the exact same questions
    assertEquals(question.toLowerCase().includes("are they from europe"), false);
    assertEquals(question.toLowerCase().includes("are they male"), false);
  });

  await t.step("should handle don't know responses properly", () => {
    const conversationHistory = [
      { question: "Are they from Europe?", answer: "don't know" },
      { question: "Are they male?", answer: "yes" }
    ];
    const remainingItems = ["Winston Churchill", "George Washington", "Abraham Lincoln"];
    
    const question = DecisionTree.generateOptimalQuestion(
      "world leaders", 
      conversationHistory, 
      remainingItems
    );
    
    assertExists(question);
    assertEquals(typeof question, "string");
    // Should generate a different type of question since geography is unknown
    assertStringIncludes(question.toLowerCase(), "?");
  });

  await t.step("should generate fallback question when no good options", () => {
    const conversationHistory = [
      { question: "Are they living?", answer: "yes" },
      { question: "Are they male?", answer: "yes" },
      { question: "Are they from Europe?", answer: "no" },
      { question: "Are they from Asia?", answer: "no" }
    ];
    const remainingItems = ["John F. Kennedy"];
    
    const question = DecisionTree.generateOptimalQuestion(
      "world leaders", 
      conversationHistory, 
      remainingItems
    );
    
    assertExists(question);
    assertEquals(typeof question, "string");
  });

  await t.step("should handle empty conversation history", () => {
    const conversationHistory: Array<{question: string, answer: string}> = [];
    const remainingItems = ["Winston Churchill", "Napoleon Bonaparte", "Gandhi"];
    
    const question = DecisionTree.generateOptimalQuestion(
      "world leaders", 
      conversationHistory, 
      remainingItems
    );
    
    assertExists(question);
    assertEquals(typeof question, "string");
    assertStringIncludes(question.toLowerCase(), "?");
  });

  await t.step("should handle unknown category with generic questions", () => {
    const conversationHistory = [
      { question: "Is it living?", answer: "no" }
    ];
    const remainingItems = ["car", "book", "chair"];
    
    const question = DecisionTree.generateOptimalQuestion(
      "unknown category", 
      conversationHistory, 
      remainingItems
    );
    
    assertExists(question);
    assertEquals(typeof question, "string");
    assertStringIncludes(question.toLowerCase(), "?");
  });

  await t.step("should handle cricketers category", () => {
    const conversationHistory = [
      { question: "Is he from India?", answer: "yes" }
    ];
    const remainingItems = ["Virat Kohli", "MS Dhoni", "Sachin Tendulkar"];
    
    const question = DecisionTree.generateOptimalQuestion(
      "cricketers", 
      conversationHistory, 
      remainingItems
    );
    
    assertExists(question);
    assertEquals(typeof question, "string");
    assertStringIncludes(question.toLowerCase(), "?");
  });

  await t.step("should handle food category", () => {
    const conversationHistory = [
      { question: "Is it a fruit?", answer: "no" }
    ];
    const remainingItems = ["pizza", "bread", "cheese", "chicken"];
    
    const question = DecisionTree.generateOptimalQuestion(
      "food", 
      conversationHistory, 
      remainingItems
    );
    
    assertExists(question);
    assertEquals(typeof question, "string");
    assertStringIncludes(question.toLowerCase(), "?");
  });
});