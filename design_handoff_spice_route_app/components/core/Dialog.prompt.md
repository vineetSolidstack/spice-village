Mobile bottom-sheet dialog with grab handle; 20px top radius, cocoa scrim.
```jsx
<Dialog open={open} onClose={close} title="Remove item?" footer={<><Button variant="ghost" onClick={close}>Keep</Button><Button variant="danger">Remove</Button></>}>…</Dialog>
```