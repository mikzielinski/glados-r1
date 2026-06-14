One line in the agent transcript. `author="oko"` is the machine voice (lens marker + mono byline, full-width, no bubble); `author="user"` is a contained right-aligned bubble.

```jsx
<MessageBubble author="oko" time="14:02">
  Otworzyłam drzwi. Tym razem proszę nie ginąć.
</MessageBubble>
<MessageBubble author="user" time="14:02">Dzięki.</MessageBubble>
<MessageBubble author="oko" typing>Analizuję</MessageBubble>
```

Props: `author` (oko/user), `name`, `time`, `typing` (blinking cursor).
