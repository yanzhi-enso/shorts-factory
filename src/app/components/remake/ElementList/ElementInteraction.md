### Components
- ElementList: Horizontal list at top; elements are not removed when “added” elsewhere.
- SceneRows: Vertical list beneath; each row has:
  - Unique sceneRowId.
  - A text input (can be focused / blurred).
  - A “Send” button.
  - An associated list (possibly empty) of “selected/added” elements (duplicates allowed; order presumably reflects add sequence).

### Interaction Logic

1. Default (no SceneRow input focused): Tapping an element in ElementList opens detail modal for that element (no selection effect).
1. Focused SceneRow Input: Tapping an element in ElementList adds that element instance to the currently focused SceneRow’s selected-elements list (does not remove from ElementList; duplicates permitted).
1. Exiting Focus (no other input focused): Behavior reverts to default modal-opening mode.
1. Switching Focus to Another SceneRow: Subsequent element taps add to the new focused row’s selected list; each SceneRow maintains its own independent selected-elements list.
1. Send Button: When pressed on a SceneRow, it triggers a handler that receives:
1. Current text input value.
1. Current ordered list (with duplicates) of that row’s selected elements.
1. Reactive Updates: When elements are added to a SceneRow, that row’s UI must update so any subscribers (only that row, or others interested) are notified immediately.
1. Identification: SceneRows are uniquely addressed/updated via their sceneRowId.
1. No deduplication: Adding the same element multiple times is allowed and must be preserved.
1. Modal vs. Add Mode: Mode depends solely on whether some SceneRow input is focused.
1. User can tap the selected element to drop them from the list.