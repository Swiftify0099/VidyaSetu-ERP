import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Defensive DOM patch for Google Translate / browser extensions / RichText DOM reconciler conflicts
if (typeof Node !== 'undefined' && Node.prototype) {
  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      return this.appendChild(newNode) as T;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child && child.parentNode !== this) {
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

