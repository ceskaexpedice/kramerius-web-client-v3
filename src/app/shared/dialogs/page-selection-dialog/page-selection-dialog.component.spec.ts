
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { PageSelectionDialogComponent, PageSelectionDialogData } from './page-selection-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Page } from '../../models/page.model';

describe('PageSelectionDialogComponent', () => {
    let component: PageSelectionDialogComponent;
    let fixture: ComponentFixture<PageSelectionDialogComponent>;
    const mockDialogRef = {
        close: jasmine.createSpy('close')
    };

    const mockPages: Page[] = [
        { pid: 'uuid:1', title: 'Page 1' } as Page,
        { pid: 'uuid:2', title: 'Page 2' } as Page,
        { pid: 'uuid:3', title: 'Page 3' } as Page,
        { pid: 'uuid:4', title: 'Page 4' } as Page,
        { pid: 'uuid:5', title: 'Page 5' } as Page,
        { pid: 'uuid:6', title: 'Page 6' } as Page,
        { pid: 'uuid:7', title: 'Page 7' } as Page,
        { pid: 'uuid:8', title: 'Page 8' } as Page,
        { pid: 'uuid:9', title: 'Page 9' } as Page,
        { pid: 'uuid:10', title: 'Page 10' } as Page,
    ];

    const mockData: PageSelectionDialogData = {
        pages: mockPages
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                PageSelectionDialogComponent,
                TranslateModule.forRoot(),
                NoopAnimationsModule
            ],
            providers: [
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: MAT_DIALOG_DATA, useValue: mockData }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(PageSelectionDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('Bidirectional Selection Logic', () => {

        it('should update selection when input changes (single page)', fakeAsync(() => {
            component.onPageRangeInput('1');
            tick(300); // Wait for debounce/timeout
            expect(component.selectedPagePids().has('uuid:1')).toBeTrue();
            expect(component.selectedPagePids().size).toBe(1);
        }));

        it('should update selection when input changes (list of pages)', fakeAsync(() => {
            component.onPageRangeInput('1, 3, 5');
            tick(300);
            expect(component.selectedPagePids().has('uuid:1')).toBeTrue();
            expect(component.selectedPagePids().has('uuid:3')).toBeTrue();
            expect(component.selectedPagePids().has('uuid:5')).toBeTrue();
            expect(component.selectedPagePids().size).toBe(3);
        }));

        it('should update selection when input changes (range)', fakeAsync(() => {
            component.onPageRangeInput('1-3');
            tick(300);
            expect(component.selectedPagePids().has('uuid:1')).toBeTrue();
            expect(component.selectedPagePids().has('uuid:2')).toBeTrue();
            expect(component.selectedPagePids().has('uuid:3')).toBeTrue();
            expect(component.selectedPagePids().size).toBe(3);
        }));

        it('should update selection when input changes (complex range)', fakeAsync(() => {
            component.onPageRangeInput('1, 3-5, 8');
            tick(300);
            expect(component.selectedPagePids().has('uuid:1')).toBeTrue();
            expect(component.selectedPagePids().has('uuid:3')).toBeTrue();
            expect(component.selectedPagePids().has('uuid:4')).toBeTrue();
            expect(component.selectedPagePids().has('uuid:5')).toBeTrue();
            expect(component.selectedPagePids().has('uuid:8')).toBeTrue();
            expect(component.selectedPagePids().size).toBe(5);
        }));

        it('should update input when selection changes (single page)', fakeAsync(() => {
            component.togglePageSelection('uuid:2');
            fixture.detectChanges(); // Trigger effect
            tick();
            expect(component.pageRangeInput()).toBe('2');
        }));

        it('should update input when selection changes (range)', fakeAsync(() => {
            component.togglePageSelection('uuid:1');
            component.togglePageSelection('uuid:2');
            component.togglePageSelection('uuid:3');
            fixture.detectChanges();
            tick();
            expect(component.pageRangeInput()).toBe('1-3');
        }));

        it('should update input when selection changes (complex)', fakeAsync(() => {
            component.togglePageSelection('uuid:1');
            component.togglePageSelection('uuid:3');
            component.togglePageSelection('uuid:4');
            component.togglePageSelection('uuid:7');
            fixture.detectChanges();
            tick();
            expect(component.pageRangeInput()).toBe('1,3-4,7');
        }));

        it('should handle clearing input', fakeAsync(() => {
            component.onPageRangeInput('1-3');
            tick(300);
            expect(component.selectedPagePids().size).toBe(3);

            component.onPageRangeInput('');
            tick(300);
            expect(component.selectedPagePids().size).toBe(0);
        }));
    });
});
