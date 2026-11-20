import { Component, inject, output, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../services/store.service';
import { SupabaseService } from '../services/supabase.service';

/** Lets household members invite (allow) other email addresses. */
@Component({
  selector: 'app-members-dialog',
  imports: [FormsModule],
  template: `
    <div class="backdrop" (click)="closed.emit()"></div>
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="members-title">
      <h2 id="members-title">Household</h2>
      <p class="small">
        People listed here can see and edit everything. To invite someone, add their email,
        then have them open the site and choose <strong>Create an account</strong> with that same email.
      </p>
      <ul>
        @for (m of members(); track m) {
          <li>
            <span>{{ m }} @if (m === me()) { <span class="small">(you)</span> }</span>
            @if (m !== me()) {
              <button type="button" class="add-link" (click)="remove(m)">Remove</button>
            }
          </li>
        }
      </ul>
      <form (ngSubmit)="add()" class="add">
        <label class="sr-only" for="new-member">Email to invite</label>
        <input class="input" id="new-member" name="email" type="email" placeholder="partner@example.com"
          [(ngModel)]="newEmail" required />
        <button class="btn btn-primary" type="submit">Add</button>
      </form>
      <div class="actions"><button type="button" class="btn btn-ghost" (click)="closed.emit()">Done</button></div>
    </div>
  `,
  styles: `
    .backdrop { position: fixed; inset: 0; background: rgba(46, 42, 38, 0.35); z-index: 50; }
    .dialog { position: fixed; z-index: 51; left: 50%; top: 50%; transform: translate(-50%, -50%);
      width: min(480px, calc(100vw - 24px)); background: var(--surface); border-radius: 12px;
      border: 1px solid var(--border); padding: 22px; display: flex; flex-direction: column; gap: 14px;
      box-shadow: 0 20px 50px rgba(46, 42, 38, 0.18); }
    h2 { font-family: var(--font-display); font-weight: 600; font-size: 22px; }
    p { margin: 0; }
    ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
    li { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px;
      background: var(--sand); border-radius: 6px; font-size: 14px; }
    .add { display: flex; gap: 8px; }
    .actions { display: flex; justify-content: flex-end; }
  `,
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class MembersDialog implements OnInit {
  private store = inject(StoreService);
  me = inject(SupabaseService).email;
  closed = output<void>();
  members = signal<string[]>([]);
  newEmail = '';

  async ngOnInit() {
    this.members.set(await this.store.listMembers());
  }

  async add() {
    if (!this.newEmail.trim()) return;
    if (await this.store.addMember(this.newEmail)) {
      this.newEmail = '';
      this.members.set(await this.store.listMembers());
    }
  }

  async remove(email: string) {
    if (await this.store.removeMember(email)) this.members.set(await this.store.listMembers());
  }
}
