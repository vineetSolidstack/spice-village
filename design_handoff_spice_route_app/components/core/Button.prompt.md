Pill-shaped action button; use \'primary\' (paprika) for the single main action per view, \'secondary\' tonal for supporting actions.
```jsx
<Button variant="primary" size="md" onClick={fn}>Order now</Button>
<Button variant="secondary">View menu</Button>
```
Variants: primary, secondary, accent (turmeric), outline, ghost, danger. Sizes sm/md/lg. `icon` prop takes a leading Lucide SVG.