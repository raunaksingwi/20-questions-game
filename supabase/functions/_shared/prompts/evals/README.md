# 20 Questions Game - Prompt Evaluation System

Comprehensive evaluation framework for measuring the performance of all prompts used in the 20 Questions game. This system provides detailed metrics, benchmarks, and recommendations for optimizing AI questioning, guessing, and hint generation.

## Overview

The evaluation system consists of:

- **BaseEvaluator**: Core evaluation framework with common metrics
- **QuestioningEvaluator**: Evaluates AI questioning template quality across all categories
- **GuessingEvaluator**: Measures guessing prompt builder effectiveness
- **HintEvaluator**: Assesses hint generation quality and appropriateness
- **TestScenarios**: Golden test sets, benchmarks, and adversarial tests
- **EvaluationRunner**: Orchestrates evaluations and generates reports

## Quick Start

```bash
# Run complete evaluation (all prompt types, all categories)
cd supabase/functions/_shared/prompts/evals
deno run --allow-all EvaluationRunner.ts complete

# Run quick evaluation (essential tests only)
deno run --allow-all EvaluationRunner.ts quick

# Run category-specific evaluation
deno run --allow-all EvaluationRunner.ts category animals
deno run --allow-all EvaluationRunner.ts category "world leaders"
```

## Evaluation Metrics

### AI Questioning Templates

| Metric | Description | Threshold | Critical |
|--------|-------------|-----------|----------|
| **Template Completeness** | Presence of required template sections | 80% | ✅ |
| **Category Constraint Enforcement** | Effectiveness of category-specific constraints | 90% | ✅ |
| **Binary Question Guidance** | Quality of yes/no question generation guidance | 80% | ✅ |
| **Repetition Prevention** | Semantic similarity detection and prevention | 80% | ❌ |
| **Logical Deduction Accuracy** | Accuracy of logical deduction rules | 90% | ✅ |
| **Domain Coherence** | Coherence within specific domains/categories | 80% | ❌ |
| **Strategic Progression** | Quality of strategic questioning progression | 70% | ❌ |

### Guessing Prompt Builder

| Metric | Description | Threshold | Critical |
|--------|-------------|-----------|----------|
| **Answer Classification Accuracy** | Accuracy of yes/no/maybe/unknown classification | 95% | ✅ |
| **Fact Distribution Balance** | How well facts are distributed across categories | 30% | ❌ |
| **Summary Completeness** | How completely summary covers all fact categories | 90% | ✅ |
| **Deduction Logic Accuracy** | Accuracy of logical deduction rules applied | 90% | ✅ |
| **Domain Violation Prevention** | Effectiveness of domain violation prevention | 90% | ✅ |
| **Redundancy Prevention** | Quality of redundancy detection and prevention | 80% | ❌ |

### Hint Generation

| Metric | Description | Threshold | Critical |
|--------|-------------|-----------|----------|
| **Hint Novelty** | How much new information the hint provides | 80% | ✅ |
| **Fact Consistency** | Consistency with established facts | 95% | ✅ |
| **Spoiler Avoidance** | How well hint avoids revealing the answer | 99% | ✅ |
| **Progressive Disclosure** | Appropriateness of disclosure level for game stage | 70% | ❌ |
| **Context Integration** | How well prompt integrates game context | 80% | ❌ |
| **Hint Clarity** | Clarity and readability of hint text | 80% | ❌ |

## Test Scenarios

### Golden Test Sets
- **Optimal Questioning Paths**: Known good question progressions for each category
- **Perfect Categorization**: Clear fact categorization with unambiguous answers
- **Ideal Hint Progression**: Progressive hint disclosure across game stages

### Performance Benchmarks
- **Early/Mid/Late Game**: Category-specific performance at different game stages
- **Information Gain**: Optimal question selection for maximum information gain
- **Convergence Rate**: Speed of reaching correct guesses

### Adversarial Tests
- **Edge Cases**: "Don't know" answers, contradictory information, malformed inputs
- **Category Violations**: Prevention of inappropriate cross-category questions
- **Repetition Pressure**: Extreme scenarios testing repetition prevention
- **Robustness**: Handling of unexpected inputs and error conditions

## Running Evaluations

### Complete Evaluation
```bash
deno run --allow-all EvaluationRunner.ts complete
```

Runs all evaluation suites:
- AI Questioning Templates (6 categories)
- AI Guessing Prompt Builder
- Hint Generation
- Performance Benchmarks
- Adversarial Tests

**Output**: Comprehensive JSON report with detailed metrics, category breakdown, and recommendations.

### Quick Evaluation
```bash
deno run --allow-all EvaluationRunner.ts quick
```

Runs essential tests for rapid feedback:
- 3 questioning scenarios
- 2 guessing scenarios  
- 2 hint scenarios

**Time**: ~30 seconds vs ~5 minutes for complete evaluation.

### Category-Specific Evaluation
```bash
deno run --allow-all EvaluationRunner.ts category animals
deno run --allow-all EvaluationRunner.ts category objects
deno run --allow-all EvaluationRunner.ts category "world leaders"
deno run --allow-all EvaluationRunner.ts category "cricket players"
deno run --allow-all EvaluationRunner.ts category "football players"
deno run --allow-all EvaluationRunner.ts category "nba players"
```

Focuses evaluation on a specific category with targeted test scenarios.

## Integration with Development Workflow

### Pre-Commit Evaluation
Add to your git pre-commit hooks:
```bash
#!/bin/bash
echo "Running prompt evaluation..."
cd supabase/functions/_shared/prompts/evals
deno run --allow-all EvaluationRunner.ts quick

if [ $? -ne 0 ]; then
    echo "❌ Prompt evaluation failed. Please review before committing."
    exit 1
fi
```

### Continuous Integration
Add to your CI/CD pipeline:
```yaml
- name: Evaluate Prompts
  run: |
    cd supabase/functions/_shared/prompts/evals
    deno run --allow-all EvaluationRunner.ts complete > evaluation_results.json
    
- name: Check Evaluation Results
  run: |
    # Parse results and fail CI if critical metrics below threshold
    if [ $(jq '.overallMetrics.passedTests / .overallMetrics.totalTests' evaluation_results.json | bc -l | cut -d. -f1) -eq 0 ]; then
      echo "❌ Critical evaluation failures detected"
      exit 1
    fi
```

### Development Iteration
```bash
# Test specific changes
deno run --allow-all EvaluationRunner.ts category animals

# Compare before/after changes
deno run --allow-all EvaluationRunner.ts complete > baseline.json
# Make prompt changes...
deno run --allow-all EvaluationRunner.ts complete > current.json
# Use comparison tools to analyze differences
```

## Understanding Results

### Overall Metrics
- **Pass Rate**: Percentage of tests passing their thresholds
- **Average Score**: Mean score across all metrics (0-1 scale)
- **Critical Failures**: Tests with scores below 0.5
- **Execution Time**: Total evaluation time

### Category Breakdown
Performance analysis per game category:
- Animals, Objects, World Leaders, Sports Players
- Identifies category-specific strengths and weaknesses
- Highlights areas needing optimization

### Recommendations
Actionable recommendations categorized by priority:
- 🚨 **Critical**: Immediate attention required (pass rate < 80%)
- ⚠️ **Important**: Should be addressed soon (individual category issues)
- 🔧 **Enhancement**: Performance improvements (common failure patterns)
- 📈 **Optimization**: Quality improvements (overall score < 70%)

## Interpreting Specific Metrics

### Questioning Template Metrics
- **Template Completeness**: Missing sections indicate incomplete prompt structure
- **Category Constraint Enforcement**: Low scores suggest cross-category contamination risk
- **Binary Question Guidance**: Poor scores lead to multiple-choice or vague questions
- **Repetition Prevention**: Low scores cause repetitive, unhelpful questions

### Guessing Builder Metrics
- **Answer Classification Accuracy**: Critical for proper fact categorization
- **Deduction Logic Accuracy**: Ensures logical consistency in deductions
- **Domain Violation Prevention**: Prevents inappropriate category mixing

### Hint Generation Metrics
- **Hint Novelty**: Ensures hints provide new, useful information
- **Fact Consistency**: Critical for maintaining game logic integrity
- **Spoiler Avoidance**: Prevents accidental answer revelation

## Troubleshooting

### Common Issues

**Low Pass Rates**: 
- Check category constraint enforcement
- Review logical deduction accuracy
- Validate test scenario appropriateness

**High Execution Times**:
- Reduce test scenario complexity
- Optimize metric calculation algorithms
- Consider parallel evaluation execution

**Inconsistent Results**:
- Review test scenario determinism
- Check for proper normalization
- Validate metric calculation logic

### Debug Mode
```bash
# Enable verbose logging
EVAL_DEBUG=true deno run --allow-all EvaluationRunner.ts complete

# Single test debugging
EVAL_DEBUG=true deno run --allow-all single_test_runner.ts scenario_name
```

## Extending the System

### Adding New Metrics
1. Extend `BaseEvaluator` or specific evaluator classes
2. Implement metric calculation logic
3. Add to `collectMetrics()` method
4. Update thresholds in recommendations

### Adding New Test Scenarios
1. Add scenarios to `TestScenarios.ts`
2. Update `GoldenTestSets` or create new test collections
3. Ensure scenario data matches evaluator interfaces

### Custom Evaluators
```typescript
class CustomEvaluator extends BaseEvaluator {
  constructor() {
    super('CustomEvaluator', 'custom_prompt_type')
  }
  
  protected async collectMetrics(scenario: TestScenario): Promise<EvaluationMetric[]> {
    // Implement custom evaluation logic
    return []
  }
}
```

## Performance Expectations

### Evaluation Times
- **Quick Evaluation**: ~30 seconds (7 essential tests)
- **Category Evaluation**: ~1-2 minutes (4 tests per category)  
- **Complete Evaluation**: ~5-8 minutes (40+ comprehensive tests)

### Thresholds
- **Minimum Pass Rate**: 80% for production readiness
- **Critical Metrics**: Must pass 95% threshold (marked as critical)
- **Overall Score**: Target 0.75+ for high-quality prompts

### Resource Usage
- Memory: ~50MB for complete evaluation
- CPU: Moderate (mostly text processing)
- Storage: ~1MB per evaluation report

## Best Practices

1. **Regular Evaluation**: Run evaluations after any prompt changes
2. **Baseline Tracking**: Maintain baseline results for regression detection
3. **Category Focus**: Use category-specific evaluations during development
4. **Quick Feedback**: Use quick evaluation for rapid iteration
5. **CI Integration**: Include evaluation in automated testing pipeline

## Files Structure

```
evals/
├── README.md                   # This documentation
├── BaseEvaluator.ts           # Core evaluation framework
├── QuestioningEvaluator.ts    # AI questioning template evaluator
├── GuessingEvaluator.ts       # Guessing prompt builder evaluator
├── HintEvaluator.ts           # Hint generation evaluator
├── TestScenarios.ts           # Test scenarios and golden sets
├── MetricsCollector.ts        # Metrics collection utilities
└── EvaluationRunner.ts        # Main orchestrator and CLI
```

## Contributing

When modifying prompts:
1. Run relevant category evaluation first
2. Make targeted changes
3. Run evaluation again to measure impact
4. Ensure all critical metrics still pass
5. Update test scenarios if behavior intentionally changes

For evaluation system improvements:
1. Add comprehensive test coverage for new metrics
2. Validate against golden test sets
3. Ensure backward compatibility with existing reports
4. Update documentation with new capabilities