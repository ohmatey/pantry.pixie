# Shopping List Scope Feature

## Overview

The chat interface now supports scoping conversations to a specific shopping list. This allows users to work with a particular list without having to mention its name in every message.

## User Experience

1. **List Selector**: Above the chat input, users see a dropdown showing all available lists
2. **Visual Feedback**: The selector displays:
   - List name
   - "(Default)" indicator for the default list
   - Completion status (e.g., "5/10 items")
3. **Scope Selection**: Users can select:
   - "All Lists" (default) - agent works across all lists
   - Any specific list - agent defaults to that list

## Technical Implementation

### Message Flow

```
User selects list → ListSelector updates state → User sends message →
WebSocket sends {threadId, content, listId} → Server extracts listId →
Chat service passes to agent → Agent creates tools with listId scope →
Tools prioritize scoped list
```

### Component Hierarchy

```
ChatPage
├── ListSelector (new)
│   └── useGroceryLists hook
├── ScrollArea (messages)
└── ChatInput
```

### Files Modified

**Client Side:**
- `packages/web/src/client/components/chat/ListSelector.tsx` (new)
- `packages/web/src/client/pages/(app)/chat.tsx`
- `packages/web/src/client/hooks/useWebSocket.ts`
- `packages/web/src/client/types/websocket.ts`

**Server Side:**
- `packages/web/src/server/ws/index.ts`
- `packages/web/src/server/services/chat.ts`
- `packages/web/src/server/agent/index.ts`
- `packages/web/src/server/agent/tools/add-to-list.ts`
- `packages/web/src/server/agent/tools/show-grocery-list-editor.ts`

### Tool Behavior with Scoping

#### `addToList` Tool Priority
1. Scoped list (from chat selector)
2. Explicit list name (from user message)
3. Default list

#### `showGroceryListEditor` Tool Priority
1. Explicit list ID (from user message)
2. Explicit list name (from user message)
3. Scoped list (from chat selector)
4. Default list

### Example Usage

**Before:**
```
User: "Add milk"
Agent: Adds to default "Quick Items" list

User: "Add eggs to Weekly Shopping"
Agent: Adds to "Weekly Shopping" list
```

**After (with scoping):**
```
User: [Selects "Weekly Shopping" from dropdown]
User: "Add milk"
Agent: Adds to "Weekly Shopping" list

User: "Add eggs"
Agent: Adds to "Weekly Shopping" list

User: "Show my list"
Agent: Shows "Weekly Shopping" list
```

## Benefits

1. **Reduced Friction**: No need to specify list name in every message
2. **Context Awareness**: Agent understands which list user is working with
3. **Flexibility**: Can still override with explicit list names
4. **Visual Clarity**: Users always know which list is in scope

## Future Enhancements

- Persist selected list in session storage
- Show visual indicator in chat when list is scoped
- Add list switching suggestions in agent responses
- Support multi-list operations with scope context
