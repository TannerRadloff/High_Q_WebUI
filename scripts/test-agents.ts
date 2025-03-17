#!/usr/bin/env ts-node

/**
 * Script to test agent orchestration logic
 * 
 * Usage:
 * npx ts-node scripts/test-agents.ts
 */

import { runTests } from '../lib/agents/test-agent-logic';

console.log('🤖 Starting Agent Orchestration Tests');
console.log('====================================\n');

runTests()
  .then(() => {
    console.log('\n====================================');
    console.log('✨ Agent tests completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error running agent tests:', error);
    process.exit(1);
  }); 