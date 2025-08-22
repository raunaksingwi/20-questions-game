export abstract class AIQuestioningTemplate {
  protected abstract getCategoryName(): string
  protected abstract getStrategicQuestions(): string[]
  protected abstract getQuestionProgression(): string
  protected abstract getExampleProgression(): string
  protected abstract getCategorySpecificDeductions(): string
  protected abstract getCategorySpecificRules(): string

  generate(questionsAsked: number, conversationHistory: string, alreadyAskedQuestions: string[]): string {
    const shouldGuess = this.shouldMakeSpecificGuess(questionsAsked, conversationHistory)
    
    return `You are playing 20 Questions in AI Guessing mode. The user has thought of an item within the category: ${this.getCategoryName()}.
Your job is to ask up to 20 yes/no questions to identify the item.

${this.getCoreRules()}

${this.getRepetitionPrevention(alreadyAskedQuestions)}

${this.getCategorySpecificDeductions()}

${this.getStructuredReasoningPrompt(questionsAsked, conversationHistory, alreadyAskedQuestions)}

${shouldGuess ? this.getGuessingGuidance(questionsAsked) : this.getStrategicGuidance()}

${this.getQuestionProgression()}

${this.getExampleProgression()}

Current question count: ${questionsAsked + 1} of 20.

${this.getOutputFormat()}

${conversationHistory}

${shouldGuess ? 'Based on the information gathered, make a specific guess about the exact item.' : 'Work through the structured reasoning steps above, then output only the next strategic yes/no question.'}`;
  }

  private shouldMakeSpecificGuess(questionsAsked: number, conversationHistory: string): boolean {
    const history = conversationHistory.toLowerCase()
    
    // Count how many constraining facts we have
    const constraintsCount = this.countConstrainingFacts(history)
    
    // Be more aggressive with guessing to improve user experience
    switch (this.getCategoryName().toLowerCase()) {
      case 'animals':
        // Start guessing much earlier - animals can be identified with fewer questions
        if (questionsAsked >= 8) return true
        // Or earlier if we have strong constraints (3+ constraining facts)
        if (questionsAsked >= 6 && constraintsCount >= 3) return true
        // Or very early if highly specific location/type
        if (questionsAsked >= 5 && (history.includes('africa') || history.includes('arctic') || history.includes('australia') || history.includes('marine') || history.includes('reptile'))) return true
        break
      case 'objects':
        // Start guessing earlier for objects too
        if (questionsAsked >= 7) return true
        // Or earlier if in a very specific category with good constraints
        if (questionsAsked >= 5 && constraintsCount >= 3) return true
        // Or early if highly specific context
        if (questionsAsked >= 4 && (history.includes('kitchen') || history.includes('electronic') || history.includes('tool') || history.includes('furniture'))) return true
        break
      case 'world leaders':
      case 'cricket players':
      case 'football players':
      case 'nba players':
        // People categories - start guessing much earlier since there are fewer possibilities
        if (questionsAsked >= 6) return true
        // Or very early if we have good constraints
        if (questionsAsked >= 4 && constraintsCount >= 3) return true
        // Or immediately if highly specific
        if (questionsAsked >= 3 && (history.includes('alive: no') || history.includes('retired') || history.includes('president') || history.includes('quarterback') || history.includes('captain'))) return true
        break
    }
    
    // Force guessing if we're getting close to the limit (leave room for multiple guesses)
    if (questionsAsked >= 15) return true
    
    return false
  }

  private countConstrainingFacts(history: string): number {
    // Count how many strong constraints we have identified
    let count = 0
    
    // Geographic constraints
    if (history.includes('africa') || history.includes('europe') || history.includes('asia') || history.includes('america')) count++
    
    // Type/classification constraints
    if (history.includes('mammal') || history.includes('bird') || history.includes('reptile') || history.includes('electronic') || history.includes('president') || history.includes('quarterback')) count++
    
    // Size constraints
    if (history.includes('large') || history.includes('small') || history.includes('huge') || history.includes('tiny')) count++
    
    // Temporal constraints
    if (history.includes('alive: no') || history.includes('retired') || history.includes('before 1990') || history.includes('modern')) count++
    
    // Specific domain constraints
    if (history.includes('wild') || history.includes('domestic') || history.includes('kitchen') || history.includes('tool') || history.includes('furniture')) count++
    
    return count
  }

  private getGuessingGuidance(questionsAsked: number): string {
    return `🎯 SPECIFIC GUESSING MODE (Question ${questionsAsked + 1}/20):

You have enough information to start making educated guesses! Time to be decisive and identify the specific item.

DECISIVE GUESSING STRATEGY:
• Review ALL confirmed YES/NO answers from the conversation
• Identify the 2-3 most likely specific items that match ALL confirmed facts
• Choose the MOST PROBABLE item from your analysis
• Make your guess confidently - users prefer decisive attempts over endless questions
• If your first guess is wrong, adjust and try the next most likely item

🎯 CONFIDENCE GUIDANCE:
• ${questionsAsked >= 10 ? 'You have substantial information - be confident in your guessing!' : 'You have enough constraints to make educated guesses!'}
• It's better to guess and be wrong than to frustrate users with too many questions
• Leave room for 2-3 guess attempts before reaching question 20

CRITICAL: Frame your guess as: "Is it [SPECIFIC ITEM NAME]?"
NO MORE general property questions - only specific item identification guesses!`;
  }

  private getCoreRules(): string {
    return `🎯 CORE RULES FOR ${this.getCategoryName().toUpperCase()}:
1. Ask ONE clear yes/no question that most people would know
2. Each question should eliminate approximately 50% of remaining possibilities  
3. Build logically on previous confirmed answers
4. Never repeat questions or ask about confirmed facts
5. Avoid vague, subjective, or compound questions

🎯 SYSTEMATIC QUESTIONING PROGRESSION:
• START BROAD: Begin with high-level categories that eliminate large groups
• THEN NARROW: Focus on specific characteristics within the confirmed category  
• THEN SPECIFY: Target individual identifying features
• FINALLY GUESS: When confident, make specific item guesses
• Always progress from general → specific → individual identification

${this.getCategorySpecificRules()}

🚫 AUTOMATIC QUESTION REJECTION CRITERIA - IMMEDIATE DISQUALIFICATION:

🚫 FORBIDDEN WORD PATTERNS (automatic rejection):
• Contains "or" → "Is it big or small?" → REJECT (compound question)
• Contains "what/how/when/where/why" → "What color is it?" → REJECT (open-ended)
• Contains "special/unique/notable/particular" → "Does it have special characteristics?" → REJECT (vague)
• Contains "characteristics/features/properties" without specifics → REJECT (vague)

🚫 LOGICAL VIOLATION PATTERNS (automatic rejection):
• Asking about confirmed facts → Don't repeat already confirmed information → REJECT
• Asking logical opposites → Don't ask contradictory questions → REJECT
• Asking impossible combinations → Don't violate logical constraints → REJECT
• Asking eliminated options → Don't ask about ruled-out possibilities → REJECT

⚠️ CRITICAL INSTRUCTION: If you violate ANY category boundary or ask inappropriate questions for ${this.getCategoryName().toLowerCase()}, you will fail completely!

✅ ASK CONCRETE, SPECIFIC QUESTIONS:
- Binary properties that can be answered definitively with yes/no
- Clear geographic, temporal, or categorical distinctions  
- Specific roles, functions, or classifications appropriate for ${this.getCategoryName().toLowerCase()}
- Observable characteristics that most people would know
- Well-established facts that are not subjective

🎯 QUESTION QUALITY CHECKLIST:
1. ✅ Is it concrete and specific (not vague or subjective)?
2. ✅ Can most people answer this definitively with yes/no?
3. ✅ Does it stay within ${this.getCategoryName().toLowerCase()} category boundaries?
4. ✅ Does it add new information (not deducible from confirmed facts)?
5. ✅ Am I avoiding rephrasing the same concept with different words?`;
  }

  private getRepetitionPrevention(alreadyAskedQuestions: string[]): string {
    if (alreadyAskedQuestions.length === 0) return ''
    
    return `🚫 ALREADY ASKED QUESTIONS - DO NOT REPEAT THESE EXACT QUESTIONS:
${alreadyAskedQuestions.map((q, i) => `  ${i + 1}. ${q}`).join('\n')}

🔴 CRITICAL REPETITION PREVENTION:
- DO NOT ask any of the above questions again
- DO NOT ask semantically similar variations using different words
- NEW questions must provide genuinely different information
- Check that your new question explores a truly different aspect

CRITICAL: You must ask a NEW question that has never been asked before and provides different information!`
  }

  private getStrategicGuidance(): string {
    const questions = this.getStrategicQuestions()
    return `🎯 STRATEGIC QUESTION TYPES FOR ${this.getCategoryName().toUpperCase()}:
${questions.map(q => `${q}`).join('\n')}`
  }

  private getStructuredReasoningPrompt(questionsAsked: number, conversationHistory: string, alreadyAskedQuestions: string[]): string {
    return `🧠 STRUCTURED REASONING - Follow these steps in order before asking your question:

STEP 1: REVIEW CONFIRMED FACTS
- List all YES answers from previous questions
- List all NO answers from previous questions  
- What do these facts tell me about the remaining possibilities?

STEP 2: DOMAIN COHERENCE CHECK
- Am I staying strictly within the ${this.getCategoryName()} category boundaries?
- Are all my remaining possibilities actually ${this.getCategoryName().toLowerCase()}?
- Have I eliminated any impossible combinations?
- Am I building logically on confirmed facts without contradiction?

STEP 3: IDENTIFY REMAINING POSSIBILITIES
- Based on ALL confirmed facts, what specific items could still match?
- How many possibilities roughly remain after applying all constraints?
- What sub-category within ${this.getCategoryName().toLowerCase()} am I focusing on?

STEP 4: OPTIMAL ELIMINATION STRATEGY  
- Which single property would best split my remaining possibilities roughly in half?
- What concrete, specific question would eliminate ~50% while being easily answerable?
- Does this question lead toward a logical conclusion path?

STEP 5: AVOID REPETITION AND REDUNDANCY
- Have I asked anything semantically similar using different words?
- Am I asking about something I can already deduce from existing confirmed answers?
- Is this question fundamentally different from all previous questions?

DOMAIN NARROWING ANALYSIS & COHERENCE ENFORCEMENT:
- Which sub-domain within ${this.getCategoryName().toLowerCase()} am I focusing on?
- What are the defining constraints of this sub-category?
- Which properties are mandatory vs optional for items in this sub-category?
- How can I use these constraints to eliminate impossible options?
- The domain space remains within ${this.getCategoryName().toLowerCase()} boundaries
- Stay within the established domain without violating category constraints

MANDATORY DOMAIN COHERENCE REQUIREMENTS:
${this.getCategoryName().toLowerCase() === 'animals' ? `
• ALL remaining possibilities MUST be animals (biological organisms)
• ALL questions MUST relate to: classification, habitat, diet, physical features, behavior, size
• ELIMINATED DOMAINS: objects (technology, materials), people (demographics, careers)
• SUB-DOMAIN EXAMPLES: "large African mammals", "small domesticated pets", "aquatic vertebrates"
• COHERENCE CHECK: Can I name 3-5 specific animals that match all confirmed facts?` : ''}

${this.getCategoryName().toLowerCase() === 'objects' ? `
• ALL remaining possibilities MUST be physical objects (man-made or natural things)
• ALL questions MUST relate to: material, size, function, location, technology, purpose
• ELIMINATED DOMAINS: animals (biology), people (human attributes)
• SUB-DOMAIN EXAMPLES: "electronic handheld devices", "kitchen utensils", "wooden furniture"
• COHERENCE CHECK: Can I name 3-5 specific objects that match all confirmed facts?` : ''}

${this.getCategoryName().toLowerCase().includes('leaders') || this.getCategoryName().toLowerCase().includes('players') ? `
• ALL remaining possibilities MUST be people (human individuals)
• ALL questions MUST relate to: demographics, geography, career, achievements, time periods
• ELIMINATED DOMAINS: objects (physical things), animals (biological organisms)
• SUB-DOMAIN EXAMPLES: "20th century European leaders", "retired NFL quarterbacks", "modern Asian leaders"
• COHERENCE CHECK: Can I name 3-5 specific people that match all confirmed facts?` : ''}

STEP 2: SYSTEMATIC REMAINING POSSIBILITIES ANALYSIS  
- Given ALL confirmed facts, list 5-10 specific items that could still match
- How many possibilities roughly remain after applying all constraints?
- Are there any obvious subcategories within my remaining options?

STEP 3: OPTIMAL ELIMINATION STRATEGY
- Which single property would best split my remaining possibilities roughly in half?
- What concrete, specific question would eliminate ~50% while being easily answerable?
- How can I target the largest remaining uncertainty to gain maximum information?
- Does this question lead toward a logical conclusion path?

STEP 4: RIGOROUS REPETITION & REDUNDANCY CHECK
- Have I asked anything semantically similar to my proposed question using different words?
- Am I asking about something I can already deduce from existing confirmed answers?
- Is this question fundamentally different from all ${alreadyAskedQuestions.length} previous questions?
- Does my question violate any of the forbidden patterns above?

STEP 5: RIGOROUS QUESTION VALIDATION & CONTRADICTION PREVENTION
- Is my question concrete and specific (not vague like "unique characteristics")?
- Can most people answer this definitively with yes/no (no specialized knowledge required)?
- Does this add meaningful new information that cannot be deduced?
- Does this question follow the optimal progression strategy for this category?
- Will this question help me reach the correct answer faster?

CRITICAL CONTRADICTION CHECKS - MANDATORY BEFORE ASKING:
1. ✅ LOGICAL IMPOSSIBILITY CHECK: Does this contradict any confirmed YES answers?
   - Ensure your question doesn't contradict already confirmed facts

2. ✅ DEDUCTION VIOLATION CHECK: Am I asking about something I already know?
   - Don't ask about properties that are logical consequences of confirmed facts

3. ✅ SEMANTIC DUPLICATION CHECK: Is this a rephrasing of a previous question?
   - Avoid asking the same concept using different words

4. ✅ CATEGORY BOUNDARY CHECK: Does this violate category constraints?
   - Stay strictly within ${this.getCategoryName().toLowerCase()} category boundaries

STEP 6: FINAL QUESTION SELECTION
- Based on the analysis above, what is the single best question to ask next?
- Does it satisfy all validation criteria and avoid all forbidden patterns?
- Will it lead me closer to identifying the specific item within ${this.getCategoryName().toLowerCase()}?

CRITICAL: Work through ALL these steps systematically before asking your question!`
  }

  private getOutputFormat(): string {
    return `📝 OUTPUT FORMAT REQUIREMENTS:
- Work through the structured reasoning steps above in your thinking
- Then output ONLY the final question text as a single line ending with a question mark
- Do NOT include numbering, prefixes, explanations, qualifiers, or any other text
- Your question must be concrete, specific, and appropriate for ${this.getCategoryName().toLowerCase()}
- CRITICAL: Ensure your question passes all validation checks above before asking!`
  }
}

export class AnimalsAIQuestioningTemplate extends AIQuestioningTemplate {
  protected getCategoryName(): string {
    return 'Animals'
  }

  protected getStrategicQuestions(): string[] {
    return [
      '🏷️ HIGH-IMPACT CLASSIFICATION QUESTIONS (75%+ elimination):',
      '   • "Is it a mammal?" vs "Is it a bird?" → Eliminates: reptiles, fish, insects, invertebrates',
      '   • "Is it a bird?" vs "Is it a mammal?" → Eliminates: mammals, reptiles, fish, insects', 
      '   • "Is it a vertebrate?" → Eliminates: insects, spiders, worms, jellyfish',
      '',
      '🌍 STRATEGIC HABITAT QUESTIONS (60%+ elimination):',
      '   • "Is it wild?" vs "Is it domestic?" → Eliminates: pets or wild animals',
      '   • "Does it live in water?" → Eliminates: land animals, flying animals',
      '   • "Does it live in Africa?" → Eliminates: animals from other continents',
      '',
      '📏 OPTIMAL SIZE QUESTIONS (50%+ elimination):',
      '   • "Is it larger than a dog?" → Eliminates: cats, rabbits, birds, insects',
      '   • "Is it smaller than a cat?" → Eliminates: dogs, large animals, humans',
      '   • "Is it bigger than a human?" → Eliminates: most pets and medium animals',
      '',
      '🍖 DECISIVE DIET QUESTIONS (60%+ elimination):',
      '   • "Is it carnivorous?" vs "Is it herbivorous?" → Eliminates: opposite diet types',
      '   • "Does it eat meat?" → Eliminates: herbivores (deer, elephants, rabbits)',
      '   • "Is it herbivorous?" → Eliminates: predators, omnivores',
      '',
      '🎯 DISCRIMINATING PHYSICAL FEATURES (50%+ elimination):',
      '   • "Does it have four legs?" → Eliminates: birds, fish, snakes, insects',
      '   • "Can it fly?" → Eliminates: land mammals, fish, reptiles',
      '   • "Does it have fur?" → Eliminates: birds, reptiles, fish, amphibians',
      '',
      '🎯 FINAL NARROWING BEHAVIOR QUESTIONS (before specific guesses):',
      '   • "Does it hunt in packs?" → Distinguishes: wolves vs solo predators',
      '   • "Is it nocturnal?" → Distinguishes: night vs day activity patterns',
      '   • "Does it hibernate?" → Distinguishes: seasonal behavior patterns'
    ]
  }

  protected getQuestionProgression(): string {
    return `🎯 OPTIMAL QUESTIONING PROGRESSION FOR ANIMALS:

PHASE 1: BROAD CLASSIFICATION (Questions 1-4)
🔍 Goal: Eliminate major animal categories (75% elimination rate)
• "Is it a mammal?" (eliminates birds, reptiles, fish, insects)
• "Is it a vertebrate?" (eliminates invertebrates, insects)  
• "Is it warm-blooded?" (eliminates cold-blooded animals)
• "Does it live on land?" (eliminates aquatic animals)

PHASE 2: HABITAT & LIFESTYLE (Questions 5-8)
🔍 Goal: Narrow down living environment and behavior (50% elimination rate)
• "Is it a wild animal?" (eliminates domestic pets)
• "Does it live in Africa/Asia/North America?" (continental narrowing)
• "Does it live in forests/grasslands/arctic?" (habitat specificity)
• "Is it primarily nocturnal?" (activity patterns)

PHASE 3: PHYSICAL CHARACTERISTICS (Questions 9-12)
🔍 Goal: Identify distinctive physical features (40% elimination rate)  
• "Is it larger than a dog?" (size categorization)
• "Does it have four legs?" (body structure)
• "Does it have fur/feathers/scales?" (covering type)
• "Can it fly/climb/swim?" (mobility capabilities)

PHASE 4: DIET & BEHAVIOR (Questions 13-16)
🔍 Goal: Determine feeding and social behavior (30% elimination rate)
• "Does it eat meat?" (dietary classification)
• "Does it hunt in packs?" (social structure)
• "Is it a predator?" (feeding role)
• "Does it hibernate/migrate?" (seasonal behavior)

PHASE 5: SPECIFIC IDENTIFICATION (Questions 17-20)
🔍 Goal: Make educated guesses based on accumulated knowledge
• "Is it [specific animal name]?" (targeted guesses)
• Focus on animals that match ALL confirmed characteristics
• Consider geographical distribution and commonality`
  }

  protected getExampleProgression(): string {
    return `🎯 COMPLETE EXAMPLE PROGRESSIONS FOR ANIMALS:

🔍 TARGET: Lion (Large Wild Carnivore)
Q1: "Is it a mammal?" → YES (eliminates birds, reptiles, fish: 75% elimination)
Q2: "Is it a wild animal?" → YES (eliminates pets, farm animals: 60% elimination)  
Q3: "Is it larger than a dog?" → YES (eliminates small animals: 50% elimination)
Q4: "Does it eat meat?" → YES (eliminates herbivores: 60% elimination)
Q5: "Does it live in Africa?" → YES (eliminates other continents: 70% elimination)
Q6: "Does it have four legs?" → YES (eliminates birds, snakes: 30% elimination)
Q7: "Does it have a mane?" → MAYBE (distinguishes male lions)
Q8: "Is it a lion?" → YES! ✅
📊 ELIMINATION: 1000→250→100→50→20→6→3→2→1

🔍 TARGET: Penguin (Flightless Aquatic Bird)
Q1: "Is it a mammal?" → NO (eliminates mammals, focus on other classes)
Q2: "Is it a bird?" → YES (eliminates reptiles, fish, insects: 90% elimination)
Q3: "Can it fly?" → NO (eliminates most birds: 80% elimination)
Q4: "Does it live in cold climates?" → YES (eliminates tropical birds: 70% elimination)
Q5: "Is it black and white?" → YES (distinguishes from other penguins)
Q6: "Does it swim?" → YES (confirms aquatic nature)
Q7: "Is it a penguin?" → YES! ✅
📊 ELIMINATION: 1000→200→40→8→3→2→1

🔍 TARGET: Golden Retriever (Domestic Dog Breed)
Q1: "Is it a mammal?" → YES (eliminates birds, reptiles, fish: 75% elimination)
Q2: "Is it a wild animal?" → NO (eliminates wild animals, focus on domestic: 50% elimination)
Q3: "Is it a common pet?" → YES (eliminates farm animals: 60% elimination)
Q4: "Is it larger than a cat?" → YES (eliminates small pets: 40% elimination)
Q5: "Does it have four legs?" → YES (eliminates birds, fish: 20% elimination)
Q6: "Is it a dog?" → YES (eliminates cats, other pets: 80% elimination)
Q7: "Is it golden colored?" → YES (distinguishes breed)
Q8: "Is it a Golden Retriever?" → YES! ✅
📊 ELIMINATION: 500→250→100→60→48→40→8→3→1

🎯 PROGRESSION PATTERNS:
• Wild animals: Classification → Habitat → Size → Diet → Geography → Features → Guess
• Domestic pets: Classification → Wild/Domestic → Pet type → Size → Features → Breed → Guess  
• Aquatic animals: Classification → Habitat → Special features → Geography → Specific traits → Guess
📊 AVERAGE ELIMINATION: ~55% reduction per question across all animal types

🔍 SUCCESSFUL QUESTIONING PATHS BY ANIMAL TYPE:
🔍 Mammal: Classification→Wild/Domestic→Size→Diet→Geography→Features→Species ✅
🔍 Bird: Non-mammal→Bird→Flight capability→Climate→Specific features→Species ✅  
🔍 Bird: Non-mammal→Bird→Flightless→Cold climate→Penguin ✅  
🔍 Fish: Non-mammal→Aquatic→Large→Carnivore→Shark ✅`
  }

  protected getCategorySpecificRules(): string {
    return `🚫 CRITICAL CATEGORY VIOLATION PREVENTION - ABSOLUTE PROHIBITION:

CATEGORY: ANIMALS - ONLY ASK QUESTIONS APPROPRIATE FOR ANIMALS!

✅ APPROPRIATE QUESTIONS FOR ANIMALS CATEGORY - ONLY ASK THESE TYPES:
- Biological classification: "Is it a mammal?" "Is it a bird?" "Is it a reptile?"
- Habitat: "Is it wild?" "Does it live in water?" "Does it live in Africa?"
- Physical features: "Does it have four legs?" "Can it fly?" "Does it have fur?"
- Diet: "Does it eat meat?" "Is it herbivorous?" "Is it carnivorous?"
- Behavior: "Is it nocturnal?" "Does it hunt in packs?" "Does it hibernate?"
- Size: "Is it larger than a dog?" "Is it smaller than a cat?"

🎯 ANIMALS-SPECIFIC INFORMATION GAIN STRATEGY:
• "Is it a mammal?" vs "Is it a bird?" → Eliminates ~75% of animal kingdom
• "Is it wild?" vs "Is it domestic?" → Splits animals roughly 60/40
• "Is it larger than a dog?" → Eliminates small animals effectively
• "Does it live in water?" → Targets aquatic vs land animals

🚫 ANIMALS LOGICAL CONSISTENCY RULES:
• If "mammal" = YES → NEVER ask "Is it a bird?" (impossible combination)
• If "wild" = YES → NEVER ask "Is it a pet?" (logical contradiction)
• If "carnivore" = YES → NEVER ask "Is it herbivorous?" (dietary contradiction)
• If "bird" = YES → NEVER ask "Is it a mammal?" (biological impossibility)

🚫 ANIMALS SEMANTIC SIMILARITY PREVENTION:
• "Is it wild?" = "Is it untamed?" = "Is it feral?" → SAME CONCEPT
• "Does it eat meat?" = "Is it carnivorous?" = "Is it a predator?" → SAME CONCEPT
• "Is it large?" = "Is it big?" = "Is it huge?" → SAME CONCEPT
• Choose ONE form and stick with it

🎯 ANIMALS DOMAIN COHERENCE:
• Stay within biological organism domain
• All questions must relate to living creature properties
• Focus on: classification, habitat, diet, physical features, behavior, size
• Narrow down systematically: Kingdom → Class → Size → Habitat → Specific traits`;
  }

  protected getCategorySpecificDeductions(): string {
    return `ANIMALS CATEGORY - LOGICAL DEDUCTIONS:
• If "mammal" = YES → then it's NOT a bird, reptile, fish, or insect (eliminates 75%)
• If "mammal" = NO → then it could be a bird, reptile, fish, or insect  
• If "wild" = YES → then it's NOT a domestic pet, lives in natural habitats (eliminates 50%)
• If "wild" = NO → then it could be a pet or farm animal
• If "carnivore" = YES → then it eats meat, has predatory behavior (eliminates herbivores)
• If "herbivore" = YES → then it's NOT a carnivore, eats plants only (eliminates predators)
• If "large" = YES → then it's bigger than most household pets (eliminates small animals)
• If "small" = YES → then it's NOT large animals like elephants or whales (eliminates large species)`
  }
}

export class ObjectsAIQuestioningTemplate extends AIQuestioningTemplate {
  protected getCategoryName(): string {
    return 'Objects'
  }

  protected getStrategicQuestions(): string[] {
    return [
      '📱 DECISIVE TECHNOLOGY QUESTIONS (60%+ elimination):',
      '   • "Is it electronic?" vs "Is it manual?" → Eliminates: opposite technology types',
      '   • "Does it need electricity?" → Eliminates: all manual/non-powered objects',
      '   • "Does it have a screen?" → Eliminates: non-display electronics, all manual items',
      '',
      '✋ OPTIMAL SIZE/PORTABILITY QUESTIONS (50%+ elimination):',
      '   • "Is it portable?" vs "Is it stationary?" → Eliminates: opposite size categories',
      '   • "Can you hold it in one hand?" → Eliminates: furniture, appliances, large tools',
      '   • "Is it larger than a book?" → Eliminates: small items, handheld objects',
      '',
      '🏠 STRATEGIC LOCATION QUESTIONS (40%+ elimination):',
      '   • "Is it found in a kitchen?" vs "Is it found in a bedroom?" → Eliminates: room-specific items',
      '   • "Is it kept outdoors?" → Eliminates: indoor furniture, household items',
      '   • "Is it found in offices?" → Eliminates: home-only, kitchen, recreational items',
      '',
      '🔧 HIGH-IMPACT FUNCTION QUESTIONS (50%+ elimination):',
      '   • "Do most people use it daily?" → Eliminates: specialized, occasional items',
      '   • "Is it a tool?" → Eliminates: furniture, decorative, entertainment items',
      '   • "Is it furniture?" → Eliminates: electronics, tools, handheld objects',
      '',
      '🏗️ DISCRIMINATING MATERIAL QUESTIONS (40%+ elimination):',
      '   • "Is it made of metal?" → Eliminates: plastic, wood, fabric items',
      '   • "Is it made of plastic?" → Eliminates: metal, wood, fabric items',
      '   • "Is it made of wood?" → Eliminates: electronic, metal, plastic items',
      '',
      '🎯 INTERFACE QUESTIONS (50%+ elimination):',
      '   • "Does it have buttons?" → Eliminates: buttonless electronics, manual items',
      '   • "Does it have a handle?" → Eliminates: handleless items, electronic displays',
      '   • "Does it have wheels?" → Eliminates: stationary objects, handheld items',
      '',
      '🎯 FINAL PURPOSE NARROWING (before specific guesses):',
      '   • "Is it used for communication?" → Distinguishes: phones vs other electronics',
      '   • "Is it for cooking?" → Distinguishes: kitchen tools vs other tools',
      '   • "Is it decorative?" → Distinguishes: aesthetic vs functional objects'
    ]
  }

  protected getQuestionProgression(): string {
    return `🎯 OPTIMAL QUESTIONING PROGRESSION FOR OBJECTS:

PHASE 1: TECHNOLOGY CLASSIFICATION (Questions 1-4)
🔍 Goal: Separate electronic from manual objects (60% elimination rate)
• "Is it electronic?" (eliminates all manual objects)
• "Does it need electricity/batteries?" (power requirements)
• "Does it have a screen/display?" (interface type)
• "Is it digital?" (technology level)

PHASE 2: SIZE & PORTABILITY (Questions 5-8)
🔍 Goal: Determine object size and mobility (50% elimination rate)
• "Can you hold it in one hand?" (portability test)
• "Is it larger than a book?" (size categorization) 
• "Is it portable?" (mobility classification)
• "Does it fit in a pocket/bag?" (storage size)

PHASE 3: LOCATION & USAGE CONTEXT (Questions 9-12)
🔍 Goal: Identify where object is typically found/used (40% elimination rate)
• "Is it found in a kitchen?" (room-specific location)
• "Is it found in an office?" (professional vs home use)
• "Is it kept outdoors?" (indoor vs outdoor classification)
• "Do most people have one at home?" (commonality)

PHASE 4: FUNCTION & PURPOSE (Questions 13-16)
🔍 Goal: Determine primary function and usage (40% elimination rate)
• "Is it a tool?" (functional classification)
• "Is it furniture?" (furniture vs objects)
• "Is it used for communication?" (specific purpose)
• "Do people use it daily?" (frequency of use)

PHASE 5: MATERIALS & CONSTRUCTION (Questions 17-18)
🔍 Goal: Physical composition and build (30% elimination rate)
• "Is it made of metal/plastic/wood?" (material composition)
• "Does it have moving parts?" (mechanical complexity)

PHASE 6: SPECIFIC IDENTIFICATION (Questions 19-20)
🔍 Goal: Make targeted guesses
• "Is it [specific object name]?" (targeted guesses)
• Focus on objects matching ALL confirmed characteristics`
  }

  protected getExampleProgression(): string {
    return `🎯 COMPLETE EXAMPLE PROGRESSIONS FOR OBJECTS:

🔍 TARGET: Smartphone (Electronic Handheld Communication Device)
Q1: "Is it electronic?" → YES (eliminates manual objects: 60% elimination)
Q2: "Can you hold it in one hand?" → YES (eliminates large electronics: 50% elimination)
Q3: "Does it have a screen?" → YES (eliminates non-display electronics: 40% elimination)
Q4: "Is it used for communication?" → YES (eliminates other portable electronics: 60% elimination)
Q5: "Can you make calls with it?" → YES (eliminates other communication devices: 70% elimination)
Q6: "Does it connect to the internet?" → YES (eliminates basic phones: 50% elimination)
Q7: "Is it a smartphone?" → YES! ✅
📊 ELIMINATION: 1000→400→200→120→48→14→7→1

🔍 TARGET: Wooden Chair (Furniture Seating)
Q1: "Is it electronic?" → NO (eliminates electronic objects: 60% elimination)
Q2: "Is it furniture?" → YES (eliminates tools, handheld objects: 70% elimination)
Q3: "Do people sit on it?" → YES (eliminates tables, storage furniture: 50% elimination)
Q4: "Is it made of wood?" → YES (eliminates metal, plastic furniture: 40% elimination)
Q5: "Does it have a back?" → YES (eliminates stools, benches: 30% elimination)
Q6: "Does it have four legs?" → YES (eliminates other seating: 40% elimination)
Q7: "Is it a chair?" → YES! ✅
📊 ELIMINATION: 1000→400→120→60→36→25→15→1

🔍 TARGET: Kitchen Knife (Manual Tool)
Q1: "Is it electronic?" → NO (eliminates electronic objects: 60% elimination)
Q2: "Is it a tool?" → YES (eliminates furniture, decorative items: 50% elimination)
Q3: "Is it found in a kitchen?" → YES (eliminates non-kitchen tools: 60% elimination)
Q4: "Is it made of metal?" → PARTIALLY (blade is metal, handle varies: 30% elimination)
Q5: "Is it used for cutting?" → YES (eliminates other kitchen tools: 70% elimination)
Q6: "Does it have a blade?" → YES (eliminates other cutting tools: 60% elimination)
Q7: "Is it a knife?" → YES! ✅
📊 ELIMINATION: 1000→400→200→80→56→17→7→1

🎯 PROGRESSION PATTERNS:
• Electronic objects: Technology → Size → Interface → Purpose → Specific features → Guess
• Furniture: Technology → Category → Function → Material → Size/Shape → Specific type → Guess
• Tools: Technology → Category → Location → Material → Function → Specific purpose → Guess
📊 AVERAGE ELIMINATION: ~50% reduction per question across all object types

🔍 SUCCESSFUL QUESTIONING PATHS BY OBJECT TYPE:
🔍 Electronics: Electronic→Portable→Screen→Communication→Smartphone ✅
🔍 Furniture: Non-electronic→Furniture→Seating→Wood→Chair ✅  
🔍 Kitchen: Non-electronic→Tool→Kitchen→Metal→Cutting→Knife ✅
Q7: "Does it have four legs?" → YES (eliminates other seating)
Q8: "Is it a chair?" → YES! ✅`
  }

  protected getCategorySpecificRules(): string {
    return `🚫 CRITICAL CATEGORY VIOLATION PREVENTION - ABSOLUTE PROHIBITION:

CATEGORY: OBJECTS - ONLY ASK QUESTIONS APPROPRIATE FOR OBJECTS!

✅ APPROPRIATE QUESTIONS FOR OBJECTS CATEGORY - ONLY ASK THESE TYPES:
- Technology: "Is it electronic?" "Does it need electricity?" "Does it have a screen?"
- Material: "Is it made of metal?" "Is it made of plastic?" "Is it made of wood?"
- Size/portability: "Can you hold it?" "Is it portable?" "Is it larger than a book?"
- Function: "Is it a tool?" "Do people use it daily?" "Is it furniture?"
- Location: "Is it found in a kitchen?" "Is it kept outdoors?" "Is it found in homes?"
- Interface: "Does it have buttons?" "Does it have a handle?" "Does it have wheels?"

🎯 OBJECTS-SPECIFIC INFORMATION GAIN STRATEGY:
• "Is it electronic?" vs "Is it manual?" → Eliminates ~60% of objects
• "Can you hold it?" vs "Is it furniture-sized?" → Splits by portability ~50/50
• "Is it found in a kitchen?" → Targets specific location use
• "Is it made of metal?" → Material-based elimination

🚫 OBJECTS LOGICAL CONSISTENCY RULES:
• If "electronic" = YES → NEVER ask "Is it manual?" (technology contradiction)
• If "handheld" = YES → NEVER ask "Is it furniture?" (size contradiction)
• If "kitchen" = YES → NEVER ask "Is it kept outdoors?" (location contradiction)
• If "metal" = YES → NEVER ask "Is it made of wood?" (material contradiction)

🚫 OBJECTS SEMANTIC SIMILARITY PREVENTION:
• "Is it electronic?" = "Is it digital?" = "Does it use electricity?" → SAME CONCEPT
• "Can you hold it?" = "Is it handheld?" = "Is it portable?" → SAME CONCEPT
• "Is it large?" = "Is it big?" = "Is it huge?" → SAME CONCEPT
• Choose ONE form and stick with it

🎯 OBJECTS DOMAIN COHERENCE:
• Stay within physical objects domain
• All questions must relate to inanimate item properties
• Focus on: technology, material, size, function, location, interface
• Narrow down systematically: Technology → Size → Location → Function → Specific traits`;
  }

  protected getCategorySpecificDeductions(): string {
    return `OBJECTS CATEGORY - LOGICAL DEDUCTIONS:
• If "electronic" = YES → then it's NOT living, NOT organic, NOT edible, requires power (eliminates manual objects)
• If "electronic" = NO → then it doesn't require electricity, NOT a digital device
• If "handheld" = YES → then it's portable/small, NOT furniture or large objects (eliminates large items)
• If "handheld" = NO → then it's large/heavy, you cannot carry it easily
• If "furniture" = YES → then it's NOT handheld, likely found indoors (eliminates portable items)
• If "tool" = YES → then it has a specific function, designed for tasks (eliminates decorative items)
• If "kitchen" = YES → then it's related to food/cooking, found in homes (eliminates other room items)`
  }
}

export class WorldLeadersAIQuestioningTemplate extends AIQuestioningTemplate {
  protected getCategoryName(): string {
    return 'World Leaders'
  }

  protected getStrategicQuestions(): string[] {
    return [
      '🫀 LIFE STATUS QUESTIONS: "Are they alive?" vs "Are they dead?" (eliminates 60% historical vs contemporary split)',
      '👤 GENDER QUESTIONS: "Are they male?" / "Are they female?" (eliminates 80% by demographic category)',
      '🌍 CONTINENTAL QUESTIONS: "Are they from Europe?" vs "Are they from Asia?" (eliminates 70% by geographic region)',
      '👑 ROLE TYPE QUESTIONS: "Were they a president?" vs "Were they a prime minister?" (eliminates 50% by leadership position)',
      '📅 ERA QUESTIONS: "Did they serve before 1990?" / "Were they active in the 21st century?" / "Did they serve in the 20th century?" (eliminates 50% by time period)',
      '🏆 ACHIEVEMENT QUESTIONS: "Did they win a Nobel Prize?" / "Did they lead during a major war?" / "Were they involved in World War II?" (eliminates 70% by historical significance)',
      '🏛️ POLITICAL SYSTEM QUESTIONS: "Were they democratically elected?" / "Did they come to power through revolution?" / "Were they a dictator?" (eliminates 60% by governance type)',
      '🎯 COUNTRY SPECIFIC: "Did they lead the United States?" / "Did they lead the United Kingdom?" / "Did they lead Germany?" (final narrowing before specific guesses)'
    ]
  }

  protected getQuestionProgression(): string {
    return `🎯 OPTIMAL QUESTIONING PROGRESSION FOR WORLD LEADERS:

PHASE 1: TEMPORAL CLASSIFICATION (Questions 1-3)
🔍 Goal: Historical vs Contemporary (60% elimination rate)
• "Are they still alive?" (eliminates historical vs current leaders)
• "Did they serve before 1990?" (20th vs 21st century split)
• "Were they active in the 2000s?" (recent vs historical)

PHASE 2: GEOGRAPHIC NARROWING (Questions 4-6)  
🔍 Goal: Continental/Regional identification (70% elimination rate)
• "Are they from Europe?" (continental elimination)
• "Are they from Asia/Africa/Americas?" (geographic narrowing)
• "Did they lead a major world power?" (influence level)

PHASE 3: ROLE & POSITION TYPE (Questions 7-9)
🔍 Goal: Leadership position classification (50% elimination rate)
• "Were they a president?" (executive vs other roles)
• "Were they a prime minister?" (parliamentary systems)
• "Were they a monarch/dictator?" (non-democratic leaders)

PHASE 4: HISTORICAL CONTEXT (Questions 10-12)
🔍 Goal: Era and significance (40% elimination rate)
• "Did they lead during a major war?" (wartime leaders)
• "Were they involved in World War II?" (specific conflict)
• "Did they win a Nobel Prize?" (international recognition)

PHASE 5: SPECIFIC COUNTRY (Questions 13-15)
🔍 Goal: National identification (60% elimination rate)  
• "Did they lead the United States?" (US presidents)
• "Did they lead the United Kingdom?" (British leaders)
• "Did they lead Germany/France/Russia?" (major European powers)

PHASE 6: FINAL IDENTIFICATION (Questions 16-20)
🔍 Goal: Individual identification
• "Is it [specific leader name]?" (targeted guesses)
• Focus on leaders matching ALL confirmed characteristics`
  }

  protected getExampleProgression(): string {
    return `🎯 COMPLETE EXAMPLE PROGRESSIONS FOR WORLD LEADERS:

🔍 TARGET: Winston Churchill (British WWII Prime Minister)
Q1: "Are they still alive?" → NO (eliminates contemporary leaders: 60% elimination)
Q2: "Are they from Europe?" → YES (eliminates other continents: 70% elimination)
Q3: "Were they a prime minister?" → YES (eliminates presidents, monarchs: 50% elimination)
Q4: "Did they lead during World War II?" → YES (eliminates peacetime leaders: 60% elimination)
Q5: "Did they lead the United Kingdom?" → YES (eliminates other European countries: 80% elimination)
Q6: "Were they Conservative?" → YES (eliminates Labour leaders: 50% elimination)
Q7: "Is it Winston Churchill?" → YES! ✅
📊 ELIMINATION: 500→200→60→30→12→2→1

🔍 TARGET: Barack Obama (Modern US President)  
Q1: "Are they still alive?" → YES (eliminates historical leaders: 60% elimination)
Q2: "Are they from the Americas?" → YES (eliminates other continents: 70% elimination)
Q3: "Were they a president?" → YES (eliminates other roles: 60% elimination)
Q4: "Did they lead the United States?" → YES (eliminates other American countries: 90% elimination)
Q5: "Did they serve after 2000?" → YES (eliminates older presidents: 70% elimination)
Q6: "Are they male?" → YES (eliminates female leaders: 50% elimination)
Q7: "Are they Democrat?" → YES (eliminates Republican presidents: 50% elimination)
Q8: "Is it Barack Obama?" → YES! ✅
📊 ELIMINATION: 200→80→24→14→2→1

🔍 TARGET: Nelson Mandela (South African Leader)
Q1: "Are they still alive?" → NO (eliminates contemporary leaders: 60% elimination)
Q2: "Are they from Africa?" → YES (eliminates other continents: 85% elimination)
Q3: "Were they a president?" → YES (eliminates other roles: 40% elimination)
Q4: "Did they fight against apartheid?" → YES (eliminates other African leaders: 80% elimination)
Q5: "Did they serve in prison?" → YES (eliminates other anti-apartheid leaders: 70% elimination)
Q6: "Did they win a Nobel Peace Prize?" → YES (eliminates others: 60% elimination)
Q7: "Is it Nelson Mandela?" → YES! ✅
📊 ELIMINATION: 200→120→18→11→2→1

🎯 PROGRESSION PATTERNS:
• Historical leaders: Alive/Dead → Geography → Role → Historical context → Country → Specific guess
• Modern leaders: Alive → Geography → Role → Country → Time period → Political affiliation → Guess
• Revolutionary leaders: Alive/Dead → Geography → Cause/Revolution → Achievements → Specific guess

🔍 SUCCESSFUL QUESTIONING PATHS BY LEADER TYPE:
🔍 US President: Dead→Americas→President→USA→Era→Churchill/Roosevelt/Lincoln ✅
🔍 European: Dead→Europe→Prime Minister→WWII→UK→Churchill ✅
🔍 Revolutionary: Dead→Africa→President→Anti-apartheid→Mandela ✅
Q7: "Were they assassinated?" → YES (specific historical fact)
Q8: "Is it Abraham Lincoln?" → YES! ✅`
  }

  protected getCategorySpecificRules(): string {
    return `🚫 CRITICAL CATEGORY VIOLATION PREVENTION - ABSOLUTE PROHIBITION:

CATEGORY: WORLD LEADERS - ONLY ASK QUESTIONS APPROPRIATE FOR PEOPLE!

✅ APPROPRIATE QUESTIONS FOR PEOPLE CATEGORY - ONLY ASK THESE TYPES:
- Demographics: "Are they male?" "Are they female?" "Are they still alive?"
- Geography: "Are they from Europe?" "Are they from Asia?" "Are they from Africa?"
- Career/Role: "Are they a president?" "Are they a prime minister?" "Are they retired?"
- Time periods: "Did they serve before 1990?" "Are they from the 20th century?"
- Achievements: "Did they win awards?" "Have they won championships?" "Are they famous?"
- Characteristics: "Are they controversial?" "Are they considered great?"

🎯 WORLD LEADERS-SPECIFIC INFORMATION GAIN STRATEGY:
• "Are they alive?" vs "Are they historical?" → Eliminates ~70% of leaders
• "Are they from Europe?" vs "Are they from other continents?" → Geographic split ~40/60
• "Were they a president?" vs "Were they other roles?" → Position-based elimination
• "Did they serve before 1990?" → Temporal division roughly 50/50

🚫 WORLD LEADERS LOGICAL CONSISTENCY RULES:
• If "alive" = YES → NEVER ask "Are they dead?" (life status contradiction)
• If "male" = YES → NEVER ask "Are they female?" (gender contradiction)
• If "Europe" = YES → NEVER ask "Are they from Asia?" (geographic contradiction)
• If "president" = YES → NEVER ask "Were they a monarch?" (role contradiction)

🚫 WORLD LEADERS SEMANTIC SIMILARITY PREVENTION:
• "Are they alive?" = "Are they living?" = "Are they not dead?" → SAME CONCEPT
• "Are they male?" = "Are they a man?" = "Are they masculine?" → SAME CONCEPT
• "Are they from Europe?" = "Are they European?" → SAME CONCEPT
• Choose ONE form and stick with it

🎯 WORLD LEADERS DOMAIN COHERENCE:
• Stay within human political leaders domain
• All questions must relate to people and their leadership roles
• Focus on: demographics, geography, career, time periods, achievements
• Narrow down systematically: Era → Geography → Role → Specific achievements → Individual`;
  }

  protected getCategorySpecificDeductions(): string {
    return `WORLD LEADERS CATEGORY - LOGICAL DEDUCTIONS:
• If "alive" = YES → then they are currently serving or recently served, NOT historical figures (eliminates past leaders)
• If "alive" = NO → then they are historical figures, NOT currently in office
• If "male" = YES → then they are NOT female (eliminates female leaders)
• If "male" = NO → then they are NOT male (female leaders)
• If "president" = YES → then they held presidential office, NOT monarchs or PMs (eliminates other roles)
• If "Europe" = YES → then they are NOT from Asia, Africa, Americas, or Oceania (eliminates other continents)
• If "before 1990" = YES → then they are historical leaders, likely deceased (eliminates modern leaders)
• If "democratically elected" = YES → then they came to power through elections, NOT coups/inheritance (eliminates dictators)`
  }
}

export class CricketPlayersAIQuestioningTemplate extends AIQuestioningTemplate {
  protected getCategoryName(): string {
    return 'Cricket Players'
  }

  protected getStrategicQuestions(): string[] {
    return [
      'Activity Status: "Are they currently active?" "Are they retired?"',
      'National Team: "Are they from India?" "Are they from Australia?" "Are they from England?"', 
      'Playing Role: "Are they a batsman?" "Are they a bowler?" "Are they a wicket-keeper?"',
      'Era: "Did they play before 2010?" "Are they from the modern era?" "Did they play in the 90s?"',
      'Achievements: "Have they captained their country?" "Have they scored a double century?" "Are they in the Hall of Fame?"',
      'Format Specialization: "Are they known for Test cricket?" "Are they a T20 specialist?" "Did they excel in ODIs?"',
      'Style: "Are they a fast bowler?" "Are they a spinner?" "Are they an aggressive batsman?"'
    ]
  }

  protected getQuestionProgression(): string {
    return `MOST EFFICIENT QUESTIONING ORDER:
1. Activity: "Are they currently active?" (huge elimination)  
2. Country: "Are they from India/Australia/England?" (geographic narrowing)
3. Role: "Are they a batsman/bowler?" (position split)
4. Era: "Did they play before 2010?" (generation)
5. Achievement: "Have they captained their country?" (status level)
6. Then make specific guesses`
  }

  protected getExampleProgression(): string {
    return `EXAMPLE PROGRESSION: Active → Indian → Batsman → Captain → Top scorer → Virat Kohli`
  }

  protected getCategorySpecificRules(): string {
    return `🚫 CRITICAL CATEGORY VIOLATION PREVENTION - ABSOLUTE PROHIBITION:

CATEGORY: CRICKET PLAYERS - ONLY ASK QUESTIONS APPROPRIATE FOR PEOPLE!

✅ APPROPRIATE QUESTIONS FOR PEOPLE CATEGORY - ONLY ASK THESE TYPES:
- Demographics: "Are they male?" "Are they female?" "Are they still alive?"
- Geography: "Are they from India?" "Are they from Australia?" "Are they from England?"
- Career/Role: "Are they a batsman?" "Are they a bowler?" "Are they retired?"
- Time periods: "Did they play before 2010?" "Are they from the modern era?"
- Achievements: "Have they captained their country?" "Are they in the Hall of Fame?"
- Characteristics: "Are they known for scoring?" "Are they aggressive players?"`;
  }

  protected getCategorySpecificDeductions(): string {
    return `CRICKET PLAYERS CATEGORY - LOGICAL DEDUCTIONS:
• If "active" = YES → They are currently playing, NOT retired
• If "active" = NO → They are retired players, historical figures
• If "Indian" = YES → They are NOT from Australia, England, or other countries
• If "batsman" = YES → They are NOT primarily bowlers or wicket-keepers
• If "captain" = YES → They have leadership experience, likely senior players
• If "before 2010" = YES → They are from earlier cricket eras`
  }
}

export class FootballPlayersAIQuestioningTemplate extends AIQuestioningTemplate {
  protected getCategoryName(): string {
    return 'Football Players'
  }

  protected getStrategicQuestions(): string[] {
    return [
      'Activity Status: "Are they currently active?" "Are they retired?"',
      'Position: "Are they a quarterback?" "Are they on defense?" "Are they a running back?"',
      'Achievement: "Have they won a Super Bowl?" "Are they a Hall of Famer?"',
      'Team: "Have they played for the Patriots?" "Are they AFC?" "Are they NFC?"',
      'Era: "Did they play before 2010?" "Are they from the 2000s era?"',
      'Style: "Are they primarily known for passing?" "Are they known for running?"'
    ]
  }

  protected getQuestionProgression(): string {
    return `MOST EFFICIENT QUESTIONING ORDER:
1. Activity: "Are they currently active?" (huge elimination)
2. Position: "Are they a quarterback?" (position split)
3. Achievement: "Have they won a Super Bowl?" (success level)
4. Conference: "Are they AFC?" (league narrowing)
5. Era: "Did they play before 2010?" (generation)
6. Then make specific guesses`
  }

  protected getExampleProgression(): string {
    return `EXAMPLE PROGRESSION: Retired → QB → Multiple Super Bowls → AFC → Patriots → Tom Brady`
  }

  protected getCategorySpecificRules(): string {
    return `🚫 CRITICAL CATEGORY VIOLATION PREVENTION - ABSOLUTE PROHIBITION:

CATEGORY: FOOTBALL PLAYERS - ONLY ASK QUESTIONS APPROPRIATE FOR PEOPLE!

✅ APPROPRIATE QUESTIONS FOR PEOPLE CATEGORY - ONLY ASK THESE TYPES:
- Demographics: "Are they male?" "Are they female?" "Are they still alive?"
- Geography: "Are they from the US?" "Are they from a specific state?"
- Career/Role: "Are they a quarterback?" "Are they on defense?" "Are they retired?"
- Time periods: "Did they play before 2010?" "Are they from the modern era?"
- Achievements: "Have they won a Super Bowl?" "Are they a Hall of Famer?"
- Characteristics: "Are they known for passing?" "Are they aggressive players?"`;
  }

  protected getCategorySpecificDeductions(): string {
    return `FOOTBALL PLAYERS CATEGORY - LOGICAL DEDUCTIONS:
• If "active" = YES → They are currently playing, NOT retired
• If "active" = NO → They are retired players, possibly Hall of Famers
• If "quarterback" = YES → They are NOT defensive players or other positions
• If "Super Bowl" = YES → They are successful, accomplished players
• If "AFC" = YES → They are NOT from NFC teams
• If "offense" = YES → They are NOT defensive players`
  }
}

export class NBAPlayersAIQuestioningTemplate extends AIQuestioningTemplate {
  protected getCategoryName(): string {
    return 'NBA Players'
  }

  protected getStrategicQuestions(): string[] {
    return [
      'Activity Status: "Are they currently active?" "Are they retired?"',
      'Position: "Are they a guard?" "Are they a center?" "Are they a forward?"',
      'Achievement: "Have they won an NBA championship?" "Are they a Hall of Famer?" "Have they won MVP?"',
      'Conference: "Are they Western Conference?" "Are they Eastern Conference?"',
      'Team: "Have they played for the Lakers?" "Have they played for the Warriors?" "Are they associated with one franchise?"',
      'Era: "Did they play before 2000?" "Are they from the modern era?" "Did they play in the 90s?"',
      'Style: "Are they known for scoring?" "Are they known for defense?" "Are they a playmaker?"'
    ]
  }

  protected getQuestionProgression(): string {
    return `MOST EFFICIENT QUESTIONING ORDER:
1. Activity: "Are they currently active?" (huge elimination)
2. Position: "Are they a guard/forward/center?" (position split)  
3. Achievement: "Have they won championships?" (success level)
4. Conference: "Are they Western/Eastern?" (geographic split)
5. Era: "Did they play before 2000?" (generation)
6. Then make specific guesses`
  }

  protected getExampleProgression(): string {
    return `EXAMPLE PROGRESSION: Retired → Guard → Championships → Western → Lakers → Kobe Bryant`
  }

  protected getCategorySpecificRules(): string {
    return `🚫 CRITICAL CATEGORY VIOLATION PREVENTION - ABSOLUTE PROHIBITION:

CATEGORY: NBA PLAYERS - ONLY ASK QUESTIONS APPROPRIATE FOR PEOPLE!

✅ APPROPRIATE QUESTIONS FOR PEOPLE CATEGORY - ONLY ASK THESE TYPES:
- Demographics: "Are they male?" "Are they female?" "Are they still alive?"
- Geography: "Are they from the US?" "Are they international?"
- Career/Role: "Are they a guard?" "Are they a center?" "Are they retired?"
- Time periods: "Did they play before 2000?" "Are they from the modern era?"
- Achievements: "Have they won championships?" "Are they a Hall of Famer?"
- Characteristics: "Are they known for scoring?" "Are they defensive players?"`;
  }

  protected getCategorySpecificDeductions(): string {
    return `NBA PLAYERS CATEGORY - LOGICAL DEDUCTIONS:
• If "active" = YES → They are currently playing, NOT retired
• If "active" = NO → They are retired players, possibly legends
• If "guard" = YES → They are NOT centers or forwards
• If "champion" = YES → They have won NBA titles, accomplished players
• If "Western" = YES → They are NOT from Eastern Conference teams
• If "Lakers" = YES → They have played for this specific franchise`
  }
}

export class GeneralAIQuestioningTemplate extends AIQuestioningTemplate {
  protected getCategoryName(): string {
    return 'General'
  }

  protected getStrategicQuestions(): string[] {
    return [
      'Basic Classification: "Is it living?" "Is it man-made?"',
      'Size: "Is it larger than a person?" "Can you hold it?"',
      'Function: "Do people use it?" "Does it serve a purpose?"',
      'Location: "Is it found indoors?" "Is it common?"'
    ]
  }

  protected getQuestionProgression(): string {
    return `General progression:
1. Broad category identification
2. Size and accessibility  
3. Focus on specific characteristics
4. Make educated guesses when possibilities are limited`
  }

  protected getExampleProgression(): string {
    return `EXAMPLE PROGRESSION: Broad Category → Key Property → Specific Trait → Final Guess`
  }

  protected getCategorySpecificRules(): string {
    return `🚫 CRITICAL CATEGORY VIOLATION PREVENTION - ABSOLUTE PROHIBITION:

CATEGORY: GENERAL - ASK BROAD CLASSIFICATION QUESTIONS!

✅ APPROPRIATE QUESTIONS FOR GENERAL CATEGORY - ONLY ASK THESE TYPES:
- Basic classification: "Is it living?" "Is it man-made?" "Is it natural?"
- Size: "Is it larger than a person?" "Can you hold it?" "Is it small?"
- Function: "Do people use it?" "Does it serve a purpose?" "Is it decorative?"
- Location: "Is it found indoors?" "Is it common?" "Is it rare?"`;
  }

  protected getCategorySpecificDeductions(): string {
    return `GENERAL CATEGORY - LOGICAL DEDUCTIONS:
• If "living" = YES → It's NOT inanimate objects, NOT electronic devices
• If "living" = NO → It's NOT biological, likely man-made or natural non-living
• If "man-made" = YES → It's NOT natural objects, designed by humans
• If "large" = YES → It's NOT small portable items
• Apply logical elimination based on confirmed properties`
  }
}

export class AIQuestioningTemplateFactory {
  static createTemplate(category: string): AIQuestioningTemplate {
    const normalizedCategory = category.toLowerCase().replace(/[^a-z\s]/g, '').trim()
    
    switch (normalizedCategory) {
      case 'animals':
        return new AnimalsAIQuestioningTemplate()
      case 'objects':
        return new ObjectsAIQuestioningTemplate()
      case 'world leaders':
        return new WorldLeadersAIQuestioningTemplate()
      case 'cricket players':
        return new CricketPlayersAIQuestioningTemplate()
      case 'football players':
        return new FootballPlayersAIQuestioningTemplate()
      case 'nba players':
        return new NBAPlayersAIQuestioningTemplate()
      default:
        return new GeneralAIQuestioningTemplate()
    }
  }
}