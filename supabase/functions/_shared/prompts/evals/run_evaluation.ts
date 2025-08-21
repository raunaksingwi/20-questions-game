#!/usr/bin/env -S deno run --allow-all

/**
 * Simple CLI script for running prompt evaluations.
 * Usage examples:
 *   deno run --allow-all run_evaluation.ts complete
 *   deno run --allow-all run_evaluation.ts quick  
 *   deno run --allow-all run_evaluation.ts category animals
 */

import { EvaluationCLI } from './EvaluationRunner.ts'

const cli = new EvaluationCLI()
await cli.run(Deno.args)