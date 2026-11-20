import { Injectable, signal } from '@angular/core';

/** Describes one input in the edit dialog. */
export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'url' | 'number' | 'select' | 'color' | 'checkbox' | 'image';
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
}

export interface EditRequest {
  title: string;
  fields: FieldDef[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: Record<string, any>;
  /** Called with the edited copy when the user clicks Save. Return true to close. */
  onSave: (value: Record<string, any>) => Promise<boolean>;
  /** Present only when editing an existing item. */
  onDelete?: () => Promise<boolean>;
}

/**
 * One shared edit dialog for the whole app.
 * Any section calls editor.open({...}) and the dialog in app.html shows up.
 */
@Injectable({ providedIn: 'root' })
export class EditorService {
  readonly current = signal<EditRequest | null>(null);

  open(request: EditRequest) {
    this.current.set({ ...request, value: { ...request.value } });
  }

  close() {
    this.current.set(null);
  }
}
