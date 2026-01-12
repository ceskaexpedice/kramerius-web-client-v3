import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-detail-article-item',
  standalone: true,
  imports: [
  ],
  templateUrl: './detail-article-item.component.html',
  styleUrl: './detail-article-item.component.scss'
})
export class DetailArticleItemComponent {
  @Input() article: any;
  @Input() isSelected: boolean = false;

  @Output() articleClicked: EventEmitter<any> = new EventEmitter<any>();

  onArticleClicked() {
    this.articleClicked.emit();
  }

  getArticleTitle(): string {
    return this.article['title.search'] || this.article.title || 'Untitled';
  }
}
