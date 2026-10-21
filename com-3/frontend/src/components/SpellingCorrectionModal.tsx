"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';

// Common English typos and high-accuracy direct corrections
const COMMON_TYPOS: Record<string, string[]> = {
  // Common misspellings reported in student assignments & general typing
  'spelig': ['spelling'],
  'editore': ['editor'],
  'editer': ['editor'],
  'authour': ['author'],
  'authers': ['authors'],
  'analysiss': ['analysis'],
  'anylysis': ['analysis'],
  'anlaysis': ['analysis'],
  'autheticity': ['authenticity'],
  'authenticy': ['authenticity'],
  'contribtion': ['contribution'],
  'contributon': ['contribution'],
  'colaborator': ['collaborator'],
  'colaborators': ['collaborators'],
  'colaborative': ['collaborative'],
  'documnt': ['document'],
  'documet': ['document'],
  'documnts': ['documents'],
  'teh': ['the'],
  'taht': ['that'],
  'wierd': ['weird'],
  'untill': ['until'],
  'occured': ['occurred'],
  'occuring': ['occurring'],
  'seperate': ['separate'],
  'seperation': ['separation'],
  'recieve': ['receive'],
  'recieved': ['received'],
  'recieving': ['receiving'],
  'beleive': ['believe'],
  'beleived': ['believed'],
  'definitly': ['definitely'],
  'definately': ['definitely'],
  'goverment': ['government'],
  'recomended': ['recommended'],
  'recomend': ['recommend'],
  'alot': ['a lot'],
  'accomodate': ['accommodate'],
  'achive': ['achieve'],
  'achievment': ['achievement'],
  'accross': ['across'],
  'aggreement': ['agreement'],
  'amoung': ['among'],
  'apparant': ['apparent'],
  'appearence': ['appearance'],
  'arguement': ['argument'],
  'basicly': ['basically'],
  'begining': ['beginning'],
  'bussiness': ['business'],
  'calender': ['calendar'],
  'catagory': ['category'],
  'collegue': ['colleague'],
  'commited': ['committed'],
  'completly': ['completely'],
  'concious': ['conscious'],
  'curiousity': ['curiosity'],
  'disapear': ['disappear'],
  'dissapoint': ['disappoint'],
  'embarass': ['embarrass'],
  'enviroment': ['environment'],
  'existance': ['existence'],
  'familar': ['familiar'],
  'finaly': ['finally'],
  'foriegn': ['foreign'],
  'fourty': ['forty'],
  'freind': ['friend'],
  'guarentee': ['guarantee'],
  'happend': ['happened'],
  'harrass': ['harass'],
  'heigth': ['height'],
  'hierachy': ['hierarchy'],
  'humourous': ['humorous'],
  'ignorence': ['ignorance'],
  'immediatly': ['immediately'],
  'incidently': ['incidentally'],
  'independant': ['independent'],
  'interupt': ['interrupt'],
  'knowlege': ['knowledge'],
  'libary': ['library'],
  'maintanance': ['maintenance'],
  'mispell': ['misspell'],
  'mispelled': ['misspelled'],
  'neccessary': ['necessary'],
  'noticable': ['noticeable'],
  'ocassion': ['occasion'],
  'occassion': ['occasion'],
  'paralell': ['parallel'],
  'peice': ['piece'],
  'posession': ['possession'],
  'prefered': ['preferred'],
  'principall': ['principal'],
  'priviledge': ['privilege'],
  'realy': ['really'],
  'refered': ['referred'],
  'relavent': ['relevant'],
  'religous': ['religious'],
  'rember': ['remember'],
  'resistence': ['resistance'],
  'responsability': ['responsibility'],
  'rythm': ['rhythm'],
  'sieze': ['seize'],
  'sentance': ['sentence'],
  'sentense': ['sentence'],
  'succesful': ['successful'],
  'suprise': ['surprise'],
  'tendancy': ['tendency'],
  'thier': ['their'],
  'tommorrow': ['tomorrow'],
  'tomorow': ['tomorrow'],
  'tounge': ['tongue'],
  'truely': ['truly'],
  'unforunately': ['unfortunately'],
  'writting': ['writing'],
  'similartiy': ['similarity'],
  'paragragh': ['paragraph'],
  'revisoin': ['revision'],
  'submited': ['submitted'],
  'assignmnt': ['assignment'],
  'performence': ['performance'],
  'resuts': ['results'],
  'algoritm': ['algorithm'],
  'plagarism': ['plagiarism'],
  'inteligence': ['intelligence'],
  'artifical': ['artificial']
};

// Base dictionary of common English & academic vocabulary words
const BASE_DICTIONARY = new Set([
  'a', 'about', 'above', 'academic', 'accept', 'access', 'according', 'account', 'across', 'act', 'action',
  'activity', 'actually', 'add', 'address', 'administration', 'admit', 'adult', 'affect', 'after', 'again',
  'against', 'age', 'agency', 'agent', 'ago', 'agree', 'agreement', 'ahead', 'air', 'all', 'allow',
  'almost', 'alone', 'along', 'already', 'also', 'although', 'always', 'american', 'among', 'amount',
  'analysis', 'analytics', 'analyze', 'and', 'animal', 'another', 'answer', 'any', 'anyone', 'anything',
  'appear', 'apply', 'approach', 'area', 'argue', 'argument', 'arm', 'around', 'arrive', 'art',
  'article', 'artist', 'as', 'ask', 'assume', 'at', 'attack', 'attention', 'attorney', 'audience',
  'author', 'authenticity', 'authority', 'available', 'avoid', 'away', 'baby', 'back', 'bad', 'bag',
  'ball', 'bank', 'bar', 'base', 'be', 'beat', 'beautiful', 'because', 'become', 'bed', 'before',
  'begin', 'behavior', 'behind', 'believe', 'benefit', 'best', 'better', 'between', 'beyond', 'big',
  'bill', 'billion', 'bit', 'black', 'blood', 'blue', 'board', 'body', 'book', 'born', 'both',
  'box', 'boy', 'break', 'bring', 'brother', 'budget', 'build', 'building', 'business', 'but', 'buy',
  'by', 'call', 'camera', 'campaign', 'can', 'cancer', 'candidate', 'capital', 'car', 'card', 'care',
  'career', 'carry', 'case', 'catch', 'cause', 'cell', 'center', 'central', 'century', 'certain',
  'certainly', 'chair', 'challenge', 'chance', 'change', 'character', 'charge', 'check', 'child',
  'choice', 'choose', 'church', 'citizen', 'city', 'civil', 'claim', 'class', 'classroom', 'clear',
  'clearly', 'close', 'coach', 'cold', 'collection', 'college', 'color', 'come', 'commercial', 'common',
  'community', 'company', 'compare', 'computer', 'concern', 'condition', 'conference', 'congress',
  'consider', 'consumer', 'contain', 'continue', 'contribution', 'control', 'cost', 'could', 'country',
  'couple', 'course', 'court', 'cover', 'create', 'crime', 'cultural', 'culture', 'cup', 'current',
  'customer', 'cut', 'dark', 'data', 'daughter', 'day', 'dead', 'deal', 'death', 'debate', 'decade',
  'decide', 'decision', 'deep', 'defense', 'degree', 'democrat', 'democratic', 'describe', 'design',
  'despite', 'detail', 'determine', 'develop', 'development', 'die', 'difference', 'different', 'difficult',
  'dinner', 'direction', 'director', 'discover', 'discuss', 'discussion', 'disease', 'do', 'doctor',
  'document', 'dog', 'door', 'down', 'draw', 'dream', 'drive', 'drop', 'drug', 'during', 'each',
  'early', 'east', 'easy', 'eat', 'economic', 'economy', 'edge', 'education', 'effect', 'effort',
  'eight', 'either', 'election', 'else', 'employee', 'end', 'energy', 'enjoy', 'enough', 'enter',
  'entire', 'environment', 'environmental', 'especially', 'establish', 'even', 'evening', 'event',
  'ever', 'every', 'everybody', 'everyone', 'everything', 'evidence', 'evolution', 'exactly', 'example',
  'executive', 'exist', 'expect', 'experience', 'expert', 'explain', 'eye', 'face', 'fact', 'factor',
  'fail', 'fall', 'family', 'far', 'fast', 'father', 'fear', 'feature', 'federal', 'feel', 'feeling',
  'few', 'field', 'fight', 'figure', 'fill', 'film', 'final', 'finally', 'financial', 'find', 'fine',
  'finger', 'finish', 'fire', 'firm', 'first', 'fish', 'five', 'floor', 'fly', 'focus', 'follow',
  'food', 'foot', 'for', 'force', 'foreign', 'forget', 'form', 'former', 'forward', 'four', 'free',
  'friend', 'from', 'front', 'full', 'fund', 'future', 'game', 'garden', 'gas', 'general', 'generation',
  'get', 'girl', 'give', 'glass', 'go', 'goal', 'good', 'government', 'great', 'green', 'ground',
  'group', 'grow', 'growth', 'guess', 'gun', 'guy', 'hair', 'half', 'hand', 'hang', 'happen',
  'happy', 'hard', 'have', 'he', 'head', 'health', 'hear', 'heart', 'heat', 'heavy', 'help', 'her',
  'here', 'herself', 'high', 'him', 'himself', 'his', 'history', 'hit', 'hold', 'home', 'hope',
  'hospital', 'hot', 'hotel', 'hour', 'house', 'how', 'however', 'huge', 'human', 'hundred', 'husband',
  'i', 'idea', 'identify', 'if', 'image', 'imagine', 'impact', 'important', 'improve', 'in',
  'include', 'including', 'increase', 'indeed', 'indicate', 'individual', 'industry', 'information',
  'inside', 'instead', 'institution', 'interest', 'interesting', 'international', 'interview', 'into',
  'investment', 'involve', 'issue', 'it', 'item', 'its', 'itself', 'job', 'join', 'just', 'keep',
  'key', 'kid', 'kill', 'kind', 'kitchen', 'know', 'knowledge', 'land', 'language', 'large', 'last',
  'late', 'later', 'laugh', 'law', 'lawyer', 'lay', 'lead', 'leader', 'learn', 'least', 'leave',
  'left', 'leg', 'legal', 'less', 'let', 'letter', 'level', 'lie', 'life', 'light', 'like', 'likely',
  'line', 'list', 'listen', 'little', 'live', 'local', 'lorem', 'ipsum', 'dolor', 'sit', 'amet',
  'long', 'look', 'lose', 'loss', 'lot', 'love', 'low', 'machine', 'magazine', 'main', 'maintain',
  'major', 'majority', 'make', 'man', 'manage', 'management', 'manager', 'many', 'market', 'marriage',
  'material', 'matter', 'may', 'maybe', 'me', 'mean', 'measure', 'media', 'medical', 'meet', 'meeting',
  'member', 'memory', 'mention', 'message', 'method', 'middle', 'might', 'military', 'million',
  'mind', 'minute', 'miss', 'mission', 'model', 'modern', 'moment', 'money', 'month', 'more',
  'morning', 'most', 'mother', 'mouth', 'move', 'movement', 'movie', 'mr', 'mrs', 'much', 'music',
  'must', 'my', 'myself', 'name', 'nation', 'national', 'natural', 'nature', 'near', 'nearly',
  'necessary', 'need', 'network', 'never', 'new', 'news', 'newspaper', 'next', 'nice', 'night', 'no',
  'none', 'nor', 'north', 'not', 'note', 'nothing', 'notice', 'now', 'number', 'occur', 'of', 'off',
  'offer', 'office', 'officer', 'official', 'often', 'oh', 'oil', 'ok', 'old', 'on', 'once', 'one',
  'only', 'onto', 'open', 'operation', 'opportunity', 'option', 'or', 'order', 'organization',
  'other', 'others', 'our', 'out', 'outside', 'over', 'own', 'owner', 'page', 'pain', 'painting',
  'paper', 'parent', 'part', 'participant', 'particular', 'particularly', 'partner', 'party', 'pass',
  'past', 'patient', 'pattern', 'pay', 'peace', 'people', 'per', 'perform', 'performance', 'perhaps',
  'period', 'person', 'personal', 'phone', 'physical', 'pick', 'picture', 'piece', 'place', 'plan',
  'plant', 'play', 'player', 'pm', 'point', 'police', 'policy', 'political', 'politics', 'poor',
  'popular', 'population', 'position', 'positive', 'possible', 'power', 'practice', 'prepare',
  'present', 'president', 'pressure', 'pretty', 'prevent', 'price', 'private', 'probably', 'problem',
  'process', 'produce', 'product', 'production', 'professional', 'professor', 'program', 'project',
  'property', 'protect', 'prove', 'provide', 'public', 'pull', 'purpose', 'push', 'put', 'quality',
  'question', 'quickly', 'quite', 'race', 'radio', 'raise', 'range', 'rate', 'rather', 'reach',
  'read', 'ready', 'real', 'reality', 'realize', 'really', 'reason', 'receive', 'recent', 'recently',
  'recognize', 'record', 'red', 'reduce', 'reflect', 'region', 'relate', 'relationship', 'religious',
  'remain', 'remember', 'remove', 'report', 'represent', 'republican', 'require', 'research',
  'resource', 'respond', 'response', 'responsibility', 'rest', 'result', 'return', 'reveal', 'rich',
  'right', 'rise', 'risk', 'road', 'rock', 'role', 'room', 'rule', 'run', 'safe', 'same', 'save',
  'say', 'scene', 'school', 'science', 'scientist', 'score', 'sea', 'season', 'seat', 'second',
  'section', 'security', 'see', 'seek', 'seem', 'sell', 'send', 'senior', 'sense', 'series',
  'serious', 'serve', 'service', 'set', 'seven', 'several', 'sex', 'sexual', 'shake', 'share',
  'she', 'shoot', 'short', 'shot', 'should', 'shoulder', 'show', 'side', 'sign', 'significant',
  'similar', 'simple', 'simply', 'since', 'sing', 'single', 'sister', 'sit', 'site', 'situation',
  'six', 'size', 'skill', 'skin', 'small', 'smile', 'so', 'social', 'society', 'soldier', 'some',
  'somebody', 'someone', 'something', 'sometimes', 'son', 'song', 'soon', 'sort', 'sound', 'source',
  'south', 'southern', 'space', 'speak', 'special', 'specific', 'speech', 'spend', 'sport', 'spring',
  'staff', 'stage', 'stand', 'standard', 'star', 'start', 'state', 'statement', 'station', 'stay',
  'step', 'still', 'stock', 'stop', 'store', 'story', 'strategy', 'street', 'strong', 'structure',
  'student', 'study', 'stuff', 'style', 'subject', 'success', 'successful', 'such', 'suddenly',
  'suffer', 'suggest', 'summer', 'support', 'sure', 'surface', 'system', 'table', 'take', 'talk',
  'task', 'tax', 'teach', 'teacher', 'team', 'technology', 'television', 'tell', 'ten', 'tend',
  'term', 'test', 'than', 'thank', 'that', 'the', 'their', 'them', 'themselves', 'then', 'theory',
  'there', 'these', 'they', 'thing', 'think', 'third', 'this', 'those', 'though', 'thought',
  'thousand', 'threat', 'three', 'through', 'throughout', 'throw', 'thus', 'time', 'to', 'today',
  'together', 'tonight', 'too', 'top', 'total', 'tough', 'toward', 'town', 'trade', 'traditional',
  'training', 'travel', 'treat', 'treatment', 'tree', 'trial', 'trip', 'trouble', 'true', 'truth',
  'try', 'turn', 'tv', 'two', 'type', 'under', 'understand', 'unit', 'until', 'up', 'upon', 'us',
  'use', 'usually', 'value', 'various', 'very', 'victim', 'view', 'violence', 'visit', 'voice',
  'vote', 'wait', 'walk', 'wall', 'want', 'war', 'watch', 'water', 'way', 'we', 'weapon', 'wear',
  'week', 'weight', 'well', 'west', 'western', 'what', 'whatever', 'when', 'where', 'whether',
  'which', 'while', 'white', 'who', 'whole', 'whom', 'whose', 'why', 'wide', 'wife', 'will', 'win',
  'wind', 'window', 'wish', 'with', 'within', 'without', 'woman', 'wonder', 'word', 'work', 'worker',
  'world', 'worry', 'would', 'write', 'writer', 'wrong', 'yard', 'yeah', 'year', 'yes', 'yet',
  'you', 'young', 'your', 'yourself'
]);

// Helper: Levenshtein distance
function levenshtein(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0));
  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;

  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[j][i] = matrix[j - 1][i - 1];
      } else {
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,     // deletion
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i - 1] + 1  // substitution
        );
      }
    }
  }
  return matrix[bn][an];
}

export interface SpellIssue {
  id: string;
  type: 'spelling' | 'grammar' | 'repeated';
  word: string;
  replacement: string;
  suggestions: string[];
  contextBefore: string;
  contextAfter: string;
  from: number;
  to: number;
}

interface SpellingCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editor: any;
  onToast?: (message: string, type?: 'success' | 'error' | 'info', title?: string) => void;
}

export default function SpellingCorrectionModal({
  isOpen,
  onClose,
  editor,
  onToast
}: SpellingCorrectionModalProps) {
  const [issues, setIssues] = useState<SpellIssue[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [replacementInput, setReplacementInput] = useState('');
  const [ignoredWords, setIgnoredWords] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  // Scan document for spelling & grammar issues
  const scanDocument = useCallback(() => {
    if (!editor) return;
    setIsScanning(true);

    const detected: SpellIssue[] = [];
    const text = editor.getText();
    if (!text || !text.trim()) {
      setIssues([]);
      setIsScanning(false);
      setHasScanned(true);
      return;
    }

    // 1. Scan for repeated consecutive words (e.g., "the the", "is is")
    const repeatedRegex = /\b([a-zA-Z]{2,})\s+\1\b/gi;
    let match: RegExpExecArray | null;
    while ((match = repeatedRegex.exec(text)) !== null) {
      const fullMatch = match[0];
      const singleWord = match[1];
      const startPos = match.index;
      const endPos = startPos + fullMatch.length;

      const before = text.slice(Math.max(0, startPos - 35), startPos);
      const after = text.slice(endPos, Math.min(text.length, endPos + 35));

      detected.push({
        id: `repeat-${startPos}-${singleWord}`,
        type: 'repeated',
        word: fullMatch,
        replacement: singleWord,
        suggestions: [singleWord],
        contextBefore: before,
        contextAfter: after,
        from: startPos + 1, // ProseMirror 1-based indexing for text
        to: endPos + 1
      });
    }

    // 2. Scan individual words for typos and dictionary violations
    const wordRegex = /\b[A-Za-z]+('?[A-Za-z]+)?\b/g;
    while ((match = wordRegex.exec(text)) !== null) {
      const rawWord = match[0];
      const lower = rawWord.toLowerCase();
      const startPos = match.index;
      const endPos = startPos + rawWord.length;

      // Skip words that are part of an already flagged repeated word
      if (detected.some(d => d.type === 'repeated' && startPos >= d.from - 1 && endPos <= d.to - 1)) {
        continue;
      }

      // Skip single letters (like 'a' or 'I'), numbers, and ignored words
      if (rawWord.length <= 1 || ignoredWords.has(lower)) {
        continue;
      }

      // Check against known typo map
      if (COMMON_TYPOS[lower]) {
        const topSuggestions = COMMON_TYPOS[lower].map(s => {
          // Preserve original casing
          if (rawWord[0] === rawWord[0].toUpperCase() && rawWord.slice(1) === rawWord.slice(1).toLowerCase()) {
            return s.charAt(0).toUpperCase() + s.slice(1);
          }
          if (rawWord === rawWord.toUpperCase()) {
            return s.toUpperCase();
          }
          return s;
        });

        const before = text.slice(Math.max(0, startPos - 35), startPos);
        const after = text.slice(endPos, Math.min(text.length, endPos + 35));

        detected.push({
          id: `typo-${startPos}-${rawWord}`,
          type: 'spelling',
          word: rawWord,
          replacement: topSuggestions[0] || rawWord,
          suggestions: topSuggestions,
          contextBefore: before,
          contextAfter: after,
          from: startPos + 1,
          to: endPos + 1
        });
        continue;
      }

      // If word is not in base dictionary
      if (!BASE_DICTIONARY.has(lower)) {
        // Find close matches using Levenshtein distance
        const candidates: { word: string; dist: number }[] = [];
        for (const dictWord of BASE_DICTIONARY) {
          if (Math.abs(dictWord.length - lower.length) > 2) continue;
          const dist = levenshtein(lower, dictWord);
          if (dist <= 2) {
            candidates.push({ word: dictWord, dist });
          }
          if (candidates.length > 25) break;
        }

        candidates.sort((a, b) => a.dist - b.dist);
        let suggestions = candidates.slice(0, 3).map(c => {
          if (rawWord[0] === rawWord[0].toUpperCase() && rawWord.slice(1) === rawWord.slice(1).toLowerCase()) {
            return c.word.charAt(0).toUpperCase() + c.word.slice(1);
          }
          return c.word;
        });

        // If no close dictionary suggestions found, check common suffix/plural
        if (suggestions.length === 0 && lower.endsWith('s') && BASE_DICTIONARY.has(lower.slice(0, -1))) {
          // Normal plural form, not an error
          continue;
        }
        if (suggestions.length === 0 && lower.endsWith('ed') && BASE_DICTIONARY.has(lower.slice(0, -2))) {
          // Normal past tense, not an error
          continue;
        }
        if (suggestions.length === 0 && lower.endsWith('ing') && BASE_DICTIONARY.has(lower.slice(0, -3))) {
          // Normal progressive, not an error
          continue;
        }

        if (suggestions.length > 0) {
          const before = text.slice(Math.max(0, startPos - 35), startPos);
          const after = text.slice(endPos, Math.min(text.length, endPos + 35));

          detected.push({
            id: `dict-${startPos}-${rawWord}`,
            type: 'spelling',
            word: rawWord,
            replacement: suggestions[0],
            suggestions,
            contextBefore: before,
            contextAfter: after,
            from: startPos + 1,
            to: endPos + 1
          });
        }
      }
    }

    setIssues(detected);
    setCurrentIndex(0);
    if (detected.length > 0) {
      setReplacementInput(detected[0].replacement);
    }
    setIsScanning(false);
    setHasScanned(true);
  }, [editor, ignoredWords]);

  // Run scan when modal opens
  useEffect(() => {
    if (isOpen) {
      scanDocument();
    }
  }, [isOpen, scanDocument]);

  const currentIssue = issues[currentIndex] || null;

  // Sync replacementInput when issue changes
  useEffect(() => {
    if (currentIssue) {
      setReplacementInput(currentIssue.replacement);
      // Highlight in editor if possible
      try {
        if (editor && typeof currentIssue.from === 'number' && typeof currentIssue.to === 'number') {
          const docSize = editor.state.doc.content.size;
          const safeFrom = Math.min(Math.max(1, currentIssue.from), docSize);
          const safeTo = Math.min(Math.max(safeFrom, currentIssue.to), docSize);
          editor.commands.setTextSelection({ from: safeFrom, to: safeTo });
          editor.commands.scrollIntoView();
        }
      } catch (e) {
        // Safe fallback
      }
    }
  }, [currentIssue, editor]);

  // Replace current issue
  const handleChangeCurrent = () => {
    if (!editor || !currentIssue) return;
    const replacement = replacementInput.trim();
    if (!replacement) return;

    try {
      const currentText = editor.getText();
      const regex = new RegExp(`\\b${currentIssue.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      const match = regex.exec(currentText);

      if (match) {
        const from = match.index + 1;
        const to = from + currentIssue.word.length;
        editor.view.dispatch(editor.state.tr.insertText(replacement, from, to));
      } else {
        // Fallback: replace within full content
        const currentHtml = editor.getHTML();
        const safeRegex = new RegExp(`\\b${currentIssue.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        const updatedHtml = currentHtml.replace(safeRegex, replacement);
        editor.commands.setContent(updatedHtml, true);
      }

      if (onToast) {
        onToast(`Changed "${currentIssue.word}" to "${replacement}"`, 'success', 'Spelling Corrected');
      }
    } catch (err) {
      console.warn("Could not replace via transaction:", err);
    }

    // Advance or re-scan remaining
    const remaining = issues.filter((_, idx) => idx !== currentIndex);
    setIssues(remaining);
    if (remaining.length === 0) {
      if (onToast) onToast('All spelling and grammar checks completed!', 'success', 'Done');
    } else {
      const nextIdx = Math.min(currentIndex, remaining.length - 1);
      setCurrentIndex(nextIdx);
    }
  };

  // Replace all occurrences of the word across the whole document
  const handleChangeAll = () => {
    if (!editor || !currentIssue) return;
    const wordToReplace = currentIssue.word;
    const replacement = replacementInput.trim();
    if (!replacement) return;

    try {
      const currentHtml = editor.getHTML();
      const regex = new RegExp(`\\b${wordToReplace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      const updatedHtml = currentHtml.replace(regex, replacement);
      editor.commands.setContent(updatedHtml, true);

      if (onToast) {
        onToast(`Replaced all occurrences of "${wordToReplace}" with "${replacement}"`, 'success', 'Replaced All');
      }
    } catch (err) {
      console.warn("Could not replace all:", err);
    }

    // Remove all issues matching this word
    const remaining = issues.filter(i => i.word.toLowerCase() !== wordToReplace.toLowerCase());
    setIssues(remaining);
    if (remaining.length === 0) {
      if (onToast) onToast('All spelling and grammar checks completed!', 'success', 'Done');
    } else {
      setCurrentIndex(Math.min(currentIndex, remaining.length - 1));
    }
  };

  // Ignore current occurrence
  const handleIgnore = () => {
    if (currentIndex < issues.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Reached the end
      const remaining = issues.slice(0, currentIndex);
      setIssues(remaining);
      if (remaining.length > 0) {
        setCurrentIndex(0);
      }
    }
  };

  // Ignore all occurrences of this word
  const handleIgnoreAll = () => {
    if (!currentIssue) return;
    const wordToIgnore = currentIssue.word.toLowerCase();
    setIgnoredWords(prev => new Set([...prev, wordToIgnore]));
    const remaining = issues.filter(i => i.word.toLowerCase() !== wordToIgnore);
    setIssues(remaining);
    if (remaining.length > 0) {
      setCurrentIndex(Math.min(currentIndex, remaining.length - 1));
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '1rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.25), 0 0 1px rgba(0,0,0,0.1)',
        border: '1px solid #cbd5e1',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn 0.15s ease-out'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '0.9rem 1.25rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: '#EFF8F3',
              border: '1px solid rgba(111, 175, 154, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1a5d48'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 16l3-8 3 8" />
                <path d="M4 13h4" />
                <polyline points="14 13 16 15 21 10" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                Spelling & Grammar Check
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Automated document proofreading & AI suggestions
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              fontSize: '1.25rem',
              lineHeight: 1,
              padding: '0.2rem',
              borderRadius: '4px'
            }}
            title="Close"
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.25rem' }}>
          {isScanning ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b', fontSize: '0.85rem' }}>
              <div style={{
                width: '24px',
                height: '24px',
                border: '2px solid #e2e8f0',
                borderTop: '2px solid #6FAF9A',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 0.75rem auto'
              }} />
              Scanning document for spelling and grammar suggestions...
            </div>
          ) : issues.length === 0 ? (
            /* All Clean / No Issues Found */
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#dcfce7',
                border: '1px solid #bbf7d0',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.85rem auto',
                fontSize: '1.4rem'
              }}>
                ✓
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                Document Check Complete!
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.45 }}>
                No spelling, typo, or grammar issues were detected in this document. Everything looks clean and ready!
              </p>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={scanDocument}
                  style={{
                    padding: '0.45rem 0.9rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#334155',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Re-scan Document
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '0.45rem 1.1rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#6FAF9A',
                    color: '#0D1110',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(111, 175, 154, 0.35)'
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          ) : currentIssue ? (
            /* Active Issue Card */
            <div>
              {/* Counter & Category Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    background: currentIssue.type === 'repeated' ? '#fef3c7' : '#fee2e2',
                    color: currentIssue.type === 'repeated' ? '#b45309' : '#b91c1c',
                    border: `1px solid ${currentIssue.type === 'repeated' ? '#fde68a' : '#fecaca'}`
                  }}>
                    {currentIssue.type === 'repeated' ? 'Repeated Word' : currentIssue.type === 'grammar' ? 'Grammar' : 'Spelling'}
                  </span>
                  <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                    Suggestion {currentIndex + 1} of {issues.length}
                  </span>
                </div>

                {/* Issue Navigation Arrows */}
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button
                    type="button"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.75rem',
                      cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                      opacity: currentIndex === 0 ? 0.5 : 1
                    }}
                    title="Previous issue"
                  >
                    &larr;
                  </button>
                  <button
                    type="button"
                    disabled={currentIndex >= issues.length - 1}
                    onClick={() => setCurrentIndex(prev => Math.min(issues.length - 1, prev + 1))}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.75rem',
                      cursor: currentIndex >= issues.length - 1 ? 'not-allowed' : 'pointer',
                      opacity: currentIndex >= issues.length - 1 ? 0.5 : 1
                    }}
                    title="Next issue"
                  >
                    &rarr;
                  </button>
                </div>
              </div>

              {/* Context Box */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.75rem',
                fontSize: '0.84rem',
                color: '#334155',
                lineHeight: 1.5,
                marginBottom: '1rem'
              }}>
                <span style={{ color: '#64748b' }}>&ldquo;...{currentIssue.contextBefore}</span>
                <span style={{
                  background: '#fee2e2',
                  color: '#b91c1c',
                  fontWeight: 700,
                  padding: '0.1rem 0.35rem',
                  borderRadius: '4px',
                  borderBottom: '2px solid #ef4444',
                  margin: '0 0.15rem'
                }}>
                  {currentIssue.word}
                </span>
                <span style={{ color: '#64748b' }}>{currentIssue.contextAfter}...&rdquo;</span>
              </div>

              {/* Suggestions List */}
              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  SUGGESTED CORRECTIONS:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {currentIssue.suggestions.map((sug, i) => {
                    const isSelected = replacementInput.toLowerCase() === sug.toLowerCase();
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setReplacementInput(sug)}
                        style={{
                          background: isSelected ? '#EFF8F3' : '#ffffff',
                          border: `1.5px solid ${isSelected ? '#6FAF9A' : '#cbd5e1'}`,
                          color: isSelected ? '#0D1110' : '#1e293b',
                          fontWeight: isSelected ? 800 : 600,
                          fontSize: '0.82rem',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isSelected && <span>✓</span>}
                        <span>{sug}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Editable Replacement Field */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  REPLACE WITH:
                </label>
                <input
                  type="text"
                  value={replacementInput}
                  onChange={e => setReplacementInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.7rem',
                    borderRadius: '6px',
                    border: '1.5px solid #6FAF9A',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleChangeCurrent}
                    disabled={!replacementInput.trim()}
                    style={{
                      flex: 1,
                      background: '#6FAF9A',
                      color: '#0D1110',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.55rem',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(111, 175, 154, 0.35)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Change
                  </button>

                  <button
                    type="button"
                    onClick={handleChangeAll}
                    disabled={!replacementInput.trim()}
                    style={{
                      flex: 1,
                      background: '#ffffff',
                      color: '#1e293b',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '0.55rem',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    Change All
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleIgnore}
                    style={{
                      flex: 1,
                      background: '#f8fafc',
                      color: '#475569',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '0.45rem',
                      fontWeight: 600,
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    Ignore
                  </button>

                  <button
                    type="button"
                    onClick={handleIgnoreAll}
                    style={{
                      flex: 1,
                      background: '#f8fafc',
                      color: '#475569',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '0.45rem',
                      fontWeight: 600,
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    Ignore All
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
