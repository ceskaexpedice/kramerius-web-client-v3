import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Accordion, AccordionItemData } from '../../../../shared/components/accordion/accordion';

@Component({
  selector: 'app-document-access-denied',
  imports: [CommonModule, TranslateModule, Accordion],
  templateUrl: './document-access-denied.html',
  styleUrl: './document-access-denied.scss',
  standalone: true
})
export class DocumentAccessDenied implements OnInit {
  @Input() metadata: any;
  @Input() requiredLicenses: string[] = [];

  faqItems: AccordionItemData[] = [
    {
      id: 1,
      title: 'access-denied.faq.q1',
      content: 'access-denied.faq.a1',
      isOpen: true,
      index: 1
    },
    {
      id: 2,
      title: 'access-denied.faq.q2',
      content: 'access-denied.faq.a2',
      isOpen: false,
      index: 2
    },
    {
      id: 3,
      title: 'access-denied.faq.q3',
      content: 'access-denied.faq.a3',
      isOpen: false,
      index: 3
    },
    {
      id: 4,
      title: 'access-denied.faq.q4',
      content: 'access-denied.faq.a4',
      isOpen: false,
      index: 4
    },
    {
      id: 5,
      title: 'access-denied.faq.q5',
      content: 'access-denied.faq.a5',
      isOpen: false,
      index: 5
    },
    {
      id: 6,
      title: 'access-denied.faq.q6',
      content: 'access-denied.faq.a6',
      isOpen: false,
      index: 6
    },
    {
      id: 7,
      title: 'access-denied.faq.q7',
      content: 'access-denied.faq.a7',
      isOpen: false,
      index: 7
    },
    {
      id: 8,
      title: 'access-denied.faq.q8',
      content: 'access-denied.faq.a8',
      isOpen: false,
      index: 8
    }
  ];

  ngOnInit(): void {
    // Initialize component
  }

  getLicenseName(): string {
    if (this.requiredLicenses && this.requiredLicenses.length > 0) {
      return this.requiredLicenses[0];
    }
    return 'Díla nedostupná na trhu';
  }

  getLoginUrl(): string {
    // TODO: Generate proper login URL with redirect
    const currentUrl = window.location.href;
    return `/login?redirect=${encodeURIComponent(currentUrl)}`;
  }
}
