import {Directionality} from '@angular/cdk/bidi';
import {DOWN_ARROW, ENTER, ESCAPE, RIGHT_ARROW, UP_ARROW} from '@angular/cdk/keycodes';
import {Overlay, OverlayContainer} from '@angular/cdk/overlay';
import {ScrollDispatcher} from '@angular/cdk/scrolling';
import {
  createKeyboardEvent,
  dispatchEvent,
  dispatchFakeEvent,
  dispatchKeyboardEvent,
  dispatchMouseEvent,
} from '@angular/cdk/testing';
import {
  ClassProvider,
  Component,
  FactoryProvider,
  Type,
  ValueProvider,
  ViewChild,
} from '@angular/core';
import {ComponentFixture, fakeAsync, flush, inject, TestBed, tick} from '@angular/core/testing';
import {FormControl, FormsModule, NgModel, ReactiveFormsModule} from '@angular/forms';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  MatNativeDateModule,
  NativeDateModule,
} from '@angular/material/core';
import {MatFormField, MatFormFieldModule} from '@angular/material/form-field';
import {DEC, JAN, JUL, JUN, SEP} from '@angular/material/testing';
import {MatMomentDateModule, MomentDateAdapter} from '@angular/material-moment-adapter';
import {By} from '@angular/platform-browser';
import {BrowserDynamicTestingModule} from '@angular/platform-browser-dynamic/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import * as moment from 'moment';
import {Subject} from 'rxjs';
import {MatInputModule} from '../input/index';
import {MatDatepicker} from './datepicker';
import {MatDatepickerInput} from './datepicker-input';
import {MatDatepickerToggle} from './datepicker-toggle';
import {MAT_DATEPICKER_SCROLL_STRATEGY, MatDatepickerIntl, MatDatepickerModule} from './index';

describe('MatDatepicker', () => {
  const SUPPORTS_INTL = typeof Intl != 'undefined';

  // Creates a test component fixture.
  function createComponent(
    component: Type<any>,
    imports: Type<any>[] = [],
    providers: (FactoryProvider | ValueProvider | ClassProvider)[] = [],
    entryComponents: Type<any>[] = []): ComponentFixture<any> {

    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MatDatepickerModule,
        MatFormFieldModule,
        MatInputModule,
        NoopAnimationsModule,
        ReactiveFormsModule,
        ...imports
      ],
      providers,
      declarations: [component, ...entryComponents],
    });

    TestBed.overrideModule(BrowserDynamicTestingModule, {
      set: {
        entryComponents: [entryComponents]
      }
    }).compileComponents();

    return TestBed.createComponent(component);
  }

  afterEach(inject([OverlayContainer], (container: OverlayContainer) => {
    container.ngOnDestroy();
  }));

  describe('with MatNativeDateModule', () => {
    describe('standard datepicker', () => {
      let fixture: ComponentFixture<StandardDatepicker>;
      let testComponent: StandardDatepicker;

      beforeEach(fakeAsync(() => {
        fixture = createComponent(StandardDatepicker, [MatNativeDateModule]);
        fixture.detectChanges();

        testComponent = fixture.componentInstance;
      }));

      afterEach(fakeAsync(() => {
        testComponent.datepicker.close();
        fixture.detectChanges();
        flush();
      }));

      it('should initialize with correct value shown in input', () => {
        if (SUPPORTS_INTL) {
          expect(fixture.nativeElement.querySelector('input').value).toBe('1/1/2020');
        }
      });

    });

  });

  describe('with MatMomentDateModule', () => {
    const defaultDisplayFormat = {
        dateInput: 'l',
        monthYearLabel: 'MMM YYYY',
        dateA11yLabel: 'LL',
        monthYearA11yLabel: 'MMMM YYYY',
    };

    describe('standard picker', () => {
      let fixture: ComponentFixture<StandardMomentDatepicker>;
      let testComponent: StandardMomentDatepicker;

      beforeEach(fakeAsync(() => {
        fixture = createComponent(StandardMomentDatepicker, [MatMomentDateModule], [
          {provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE]},
          {
            provide: MAT_DATE_FORMATS,
            useValue: {
              parse: {
                dateInput: 'M/D/YYYY',
              },
              display: defaultDisplayFormat,
            },
          },
        ]);
        fixture.detectChanges();

        testComponent = fixture.componentInstance;
      }));

      afterEach(fakeAsync(() => {
        testComponent.datepicker.close();
        fixture.detectChanges();
        flush();
      }));

      it('should parse a manually entered valid date with a single format', () => {
        const selected = new Date(2017, JAN, 1);
        const inputElement = fixture.nativeElement.querySelector('input') as HTMLInputElement;
        inputElement.value = '1/1/2017';
        fixture.detectChanges();
        dispatchFakeEvent(inputElement, 'input');
        fixture.detectChanges();

        expect(testComponent.datepickerInput.value).not.toEqual(null);
        expect(testComponent.datepickerInput.value!.isSame(selected)).toEqual(true);
      });

      it('should parse a manually entered valid date with multiple formats', () => {
        TestBed.resetTestingModule();
        fixture = createComponent(
          DatepickerWithFormControl,
          [MatMomentDateModule],
          [
            {
              provide: MAT_DATE_FORMATS,
              useValue: {
                parse: {
                  dateInput: ['M/D/YYYY', 'MMMM D, YYYY'],
                },
                display: defaultDisplayFormat,
              },
            },
          ],
        );
        fixture.detectChanges();

        const tests = [
          {date: new Date(2017, JAN, 1), string: 'January 1, 2017'},
          {date: new Date(2017, JAN, 2), string: '1/2/2017'},
        ];

        for (const test of tests) {
          const selected = test.date;
          const inputElement = fixture.nativeElement.querySelector('input') as HTMLInputElement;
          inputElement.value = test.string;
          fixture.detectChanges();
          dispatchFakeEvent(inputElement, 'input');
          fixture.detectChanges();

          expect(testComponent.datepickerInput.value).not.toEqual(null);
          console.log(testComponent.datepickerInput.value!.toDate(), selected);
          expect(testComponent.datepickerInput.value!.isSame(selected)).toBe(true);
          // Something something 2020
        }
      });

      it('should not parse a manually entered invalid date with a single format', () => {
        const inputElement = fixture.nativeElement.querySelector('input') as HTMLInputElement;
        inputElement.value = 'Jan 1, 2017';
        fixture.detectChanges();
        dispatchFakeEvent(inputElement, 'input');
        fixture.detectChanges();

        expect(testComponent.datepickerInput.value).toEqual(null);
      });

      it('should not parse a manually entered invalid date with multiple formats', () => {
        TestBed.resetTestingModule();
        fixture = createComponent(
          DatepickerWithFormControl,
          [MatMomentDateModule],
          [
            {
              provide: MAT_DATE_FORMATS,
              useValue: {
                parse: {
                  dateInput: ['M/D/YYYY', 'MMMM D, YYYY'],
                },
                display: defaultDisplayFormat,
              },
            },
          ],
        );
        fixture.detectChanges();

        const inputElement = fixture.nativeElement.querySelector('input') as HTMLInputElement;
        inputElement.value = '2017-1-1';
        fixture.detectChanges();
        dispatchFakeEvent(inputElement, 'input');
        fixture.detectChanges();

        expect(testComponent.datepickerInput.value).toEqual(null);
      });

    });

  });

  describe('with missing DateAdapter and MAT_DATE_FORMATS', () => {
    it('should throw when created', () => {
      expect(() => createComponent(StandardDatepicker))
        .toThrowError(/MatDatepicker: No provider found for .*/);
    });
  });

  describe('datepicker toggle without a datepicker', () => {
    it('should not throw on init if toggle does not have a datepicker', () => {
      expect(() => {
        const fixture = createComponent(DatepickerToggleWithNoDatepicker, [MatNativeDateModule]);
        fixture.detectChanges();
      }).not.toThrow();
    });
  });

  describe('popup positioning', () => {
    let fixture: ComponentFixture<StandardDatepicker>;
    let testComponent: StandardDatepicker;
    let input: HTMLElement;

    beforeEach(fakeAsync(() => {
      fixture = createComponent(StandardDatepicker, [MatNativeDateModule]);
      fixture.detectChanges();
      testComponent = fixture.componentInstance;
      input = fixture.debugElement.query(By.css('input')).nativeElement;
      input.style.position = 'fixed';
    }));

    it('should be below and to the right when there is plenty of space', () => {
      input.style.top = input.style.left = '20px';
      testComponent.datepicker.open();
      fixture.detectChanges();

      const overlayRect = document.querySelector('.cdk-overlay-pane')!.getBoundingClientRect();
      const inputRect = input.getBoundingClientRect();

      expect(Math.floor(overlayRect.top))
          .toBe(Math.floor(inputRect.bottom), 'Expected popup to align to input bottom.');
      expect(Math.floor(overlayRect.left))
          .toBe(Math.floor(inputRect.left), 'Expected popup to align to input left.');
    });

    it('should be above and to the right when there is no space below', () => {
      input.style.bottom = input.style.left = '20px';
      testComponent.datepicker.open();
      fixture.detectChanges();

      const overlayRect = document.querySelector('.cdk-overlay-pane')!.getBoundingClientRect();
      const inputRect = input.getBoundingClientRect();

      expect(Math.floor(overlayRect.bottom))
          .toBe(Math.floor(inputRect.top), 'Expected popup to align to input top.');
      expect(Math.floor(overlayRect.left))
          .toBe(Math.floor(inputRect.left), 'Expected popup to align to input left.');
    });

    it('should be below and to the left when there is no space on the right', () => {
      input.style.top = input.style.right = '20px';
      testComponent.datepicker.open();
      fixture.detectChanges();

      const overlayRect = document.querySelector('.cdk-overlay-pane')!.getBoundingClientRect();
      const inputRect = input.getBoundingClientRect();

      expect(Math.floor(overlayRect.top))
          .toBe(Math.floor(inputRect.bottom), 'Expected popup to align to input bottom.');
      expect(Math.floor(overlayRect.right))
          .toBe(Math.floor(inputRect.right), 'Expected popup to align to input right.');
    });

    it('should be above and to the left when there is no space on the bottom', () => {
      input.style.bottom = input.style.right = '20px';
      testComponent.datepicker.open();
      fixture.detectChanges();

      const overlayRect = document.querySelector('.cdk-overlay-pane')!.getBoundingClientRect();
      const inputRect = input.getBoundingClientRect();

      expect(Math.floor(overlayRect.bottom))
          .toBe(Math.floor(inputRect.top), 'Expected popup to align to input top.');
      expect(Math.floor(overlayRect.right))
          .toBe(Math.floor(inputRect.right), 'Expected popup to align to input right.');
    });

  });

  describe('internationalization', () => {
    let fixture: ComponentFixture<DatepickerWithi18n>;
    let testComponent: DatepickerWithi18n;
    let input: HTMLInputElement;

    beforeEach(fakeAsync(() => {
      fixture = createComponent(DatepickerWithi18n, [MatNativeDateModule, NativeDateModule],
        [{provide: MAT_DATE_LOCALE, useValue: 'de-DE'}]);
      fixture.detectChanges();
      testComponent = fixture.componentInstance;
      input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    }));

    it('should have the correct input value even when inverted date format', fakeAsync(() => {
      if (typeof Intl === 'undefined') {
        // Skip this test if the internationalization API is not supported in the current
        // browser. Browsers like Safari 9 do not support the "Intl" API.
        return;
      }

      const selected = new Date(2017, SEP, 1);
      testComponent.date = selected;
      fixture.detectChanges();
      flush();
      fixture.detectChanges();

      // Normally the proper date format would 01.09.2017, but some browsers seem format the
      // date without the leading zero. (e.g. 1.9.2017).
      expect(input.value).toMatch(/0?1\.0?9\.2017/);
      expect(testComponent.datepickerInput.value).toBe(selected);
    }));
  });

  describe('datepicker with custom header', () => {
    let fixture: ComponentFixture<DatepickerWithCustomHeader>;
    let testComponent: DatepickerWithCustomHeader;

    beforeEach(fakeAsync(() => {
      fixture = createComponent(
        DatepickerWithCustomHeader,
        [MatNativeDateModule],
        [],
        [CustomHeaderForDatepicker]
      );
      fixture.detectChanges();
      testComponent = fixture.componentInstance;
    }));

    it('should instantiate a datepicker with a custom header', fakeAsync(() => {
      expect(testComponent).toBeTruthy();
    }));

    it('should find the standard header element', fakeAsync(() => {
      testComponent.datepicker.open();
      fixture.detectChanges();
      flush();
      fixture.detectChanges();

      expect(document.querySelector('mat-calendar-header')).toBeTruthy();
    }));

    it('should find the custom element', fakeAsync(() => {
        testComponent.datepicker.open();
        fixture.detectChanges();
        flush();
        fixture.detectChanges();

        expect(document.querySelector('.custom-element')).toBeTruthy();
    }));
  });

});


@Component({
  template: `
    <input [matDatepicker]="d" [value]="date">
    <mat-datepicker #d [touchUi]="touch" [disabled]="disabled" [opened]="opened"></mat-datepicker>
  `,
})
class StandardDatepicker {
  opened = false;
  touch = false;
  disabled = false;
  date: Date | null = new Date(2020, JAN, 1);
  @ViewChild('d', {static: false}) datepicker: MatDatepicker<Date>;
  @ViewChild(MatDatepickerInput, {static: false}) datepickerInput: MatDatepickerInput<Date>;
}

@Component({
  template: `
    <input [matDatepicker]="d" [value]="date">
    <mat-datepicker #d [touchUi]="touch" [disabled]="disabled" [opened]="opened"></mat-datepicker>
  `,
})
class StandardMomentDatepicker {
  opened = false;
  touch = false;
  disabled = false;
  date: Date | null = new Date(2020, JAN, 1);
  @ViewChild('d', {static: false}) datepicker: MatDatepicker<moment.Moment>;
  @ViewChild(MatDatepickerInput, {static: false})
  datepickerInput: MatDatepickerInput<moment.Moment>;
}


@Component({
  template: `
    <input [matDatepicker]="d"><input [matDatepicker]="d"><mat-datepicker #d></mat-datepicker>
  `,
})
class MultiInputDatepicker {}


@Component({
  template: `<mat-datepicker #d></mat-datepicker>`,
})
class NoInputDatepicker {
  @ViewChild('d', {static: false}) datepicker: MatDatepicker<Date>;
}


@Component({
  template: `
    <input [matDatepicker]="d" [value]="date">
    <mat-datepicker #d [startAt]="startDate"></mat-datepicker>
  `,
})
class DatepickerWithStartAt {
  date = new Date(2020, JAN, 1);
  startDate = new Date(2010, JAN, 1);
  @ViewChild('d', {static: false}) datepicker: MatDatepicker<Date>;
}


@Component({
  template: `
    <input [matDatepicker]="d" [value]="date">
    <mat-datepicker #d startView="year" (monthSelected)="onYearSelection()"></mat-datepicker>
  `,
})
class DatepickerWithStartViewYear {
  date = new Date(2020, JAN, 1);
  @ViewChild('d', {static: false}) datepicker: MatDatepicker<Date>;

  onYearSelection() {}
}


@Component({
  template: `
    <input [matDatepicker]="d" [value]="date">
    <mat-datepicker #d startView="multi-year"
        (yearSelected)="onMultiYearSelection()"></mat-datepicker>
  `,
})
class DatepickerWithStartViewMultiYear {
  date = new Date(2020, JAN, 1);
  @ViewChild('d', {static: false}) datepicker: MatDatepicker<Date>;

  onMultiYearSelection() {}
}


@Component({
  template: `
    <input [(ngModel)]="selected" [matDatepicker]="d">
    <mat-datepicker #d></mat-datepicker>
  `,
})
class DatepickerWithNgModel {
  selected: Date | null = null;
  @ViewChild('d', {static: false}) datepicker: MatDatepicker<Date>;
  @ViewChild(MatDatepickerInput, {static: false}) datepickerInput: MatDatepickerInput<Date>;
}


@Component({
  template: `
    <input [formControl]="formControl" [matDatepicker]="d">
    <mat-datepicker-toggle [for]="d"></mat-datepicker-toggle>
    <mat-datepicker #d></mat-datepicker>
  `,
})
class DatepickerWithFormControl {
  formControl = new FormControl();
  @ViewChild('d', {static: false}) datepicker: MatDatepicker<Date>;
  @ViewChild(MatDatepickerInput, {static: false}) datepickerInput: MatDatepickerInput<Date>;
  @ViewChild(MatDatepickerToggle, {static: false}) datepickerToggle: MatDatepickerToggle<Date>;
}


@Component({
  template: `
    <input [matDatepicker]="d">
    <mat-datepicker-toggle [for]="d"></mat-datepicker-toggle>
    <mat-datepicker #d [touchUi]="touchUI"></mat-datepicker>
  `,
})
class DatepickerWithToggle {
  @ViewChild('d', {static: false}) datepicker: MatDatepicker<Date>;
  @ViewChild(MatDatepickerInput, {static: false}) input: MatDatepickerInput<Date>;
  touchUI = true;
}


@Component({
  template: `
    <input [matDatepicker]="d">
    <mat-datepicker-toggle [for]="d">
      <div class="custom-icon" matDatepickerToggleIcon></div>
    </mat-datepicker-toggle>
    <mat-datepicker #d></mat-datepicker>
  `,
})
class DatepickerWithCustomIcon {}


@Component({
  template: `
      <mat-form-field>
        <input matInput [matDatepicker]="d">
        <mat-datepicker #d></mat-datepicker>
      </mat-form-field>
  `,
})
class FormFieldDatepicker {
  @ViewChild('d', {static: false}) datepicker: MatDatepicker<Date>;
  @ViewChild(MatDatepickerInput, {static: false}) datepickerInput: MatDatepickerInput<Date>;
  @ViewChild(MatFormField, {static: false}) formField: MatFormField;
}


@Component({
  template: `
    <input [matDatepicker]="d" [(ngModel)]="date" [min]="minDate" [max]="maxDate">
    <mat-datepicker-toggle [for]="d"></mat-datepicker-toggle>
    <mat-datepicker #d></mat-datepicker>
  `,
})
class DatepickerWithMinAndMaxValidation {
  @ViewChild('d', {static: false}) datepicker: MatDatepicker<Date>;
  @ViewChild(NgModel, {static: false}) model: NgModel;
  date: Date | null;
  minDate = new Date(2010, JAN, 1);
  maxDate = new Date(2020, JAN, 1);
}


@Component({
  template: `
    <input [matDatepicker]="d" [(ngModel)]="date" [matDatepickerFilter]="filter">
    <mat-datepicker-toggle [for]="d"></mat-datepicker-toggle>
    <mat-datepicker #d [touchUi]="true"></mat-datepicker>
  `,
})
class DatepickerWithFilterAndValidation {
  @ViewChild('d', {static: false}) datepicker: MatDatepicker<Date>;
  date: Date;
  filter = (date: Date) => date.getDate() != 1;
}


@Component({
  template: `
    <input [matDatepicker]="d" (change)="onChange()" (input)="onInput()"
           (dateChange)="onDateChange()" (dateInput)="onDateInput()">
    <mat-datepicker #d [touchUi]="true"></mat-datepicker>
  `
})
class DatepickerWithChangeAndInputEvents {
  @ViewChild('d', {static: false}) datepicker: MatDatepicker<Date>;

  onChange() {}

  onInput() {}

  onDateChange() {}

  onDateInput() {}
}


@Component({
  template: `
    <input [matDatepicker]="d" [(ngModel)]="date">
    <mat-datepicker #d></mat-datepicker>
  `
})
class DatepickerWithi18n {
  date: Date | null = new Date(2010, JAN, 1);
  @ViewChild('d', {static: false}) datepicker: MatDatepicker<Date>;
  @ViewChild(MatDatepickerInput, {static: false}) datepickerInput: MatDatepickerInput<Date>;
}


@Component({
  template: `
    <input [matDatepicker]="d" [(ngModel)]="value" [min]="min" [max]="max">
    <mat-datepicker #d [startAt]="startAt"></mat-datepicker>
  `
})
class DatepickerWithISOStrings {
  value = new Date(2017, JUN, 1).toISOString();
  min = new Date(2017, JAN, 1).toISOString();
  max = new Date (2017, DEC, 31).toISOString();
  startAt = new Date(2017, JUL, 1).toISOString();
  @ViewChild('d', {static: false}) datepicker: MatDatepicker<Date>;
  @ViewChild(MatDatepickerInput, {static: false}) datepickerInput: MatDatepickerInput<Date>;
}


@Component({
  template: `
    <input [(ngModel)]="selected" [matDatepicker]="d">
    <mat-datepicker (opened)="openedSpy()" (closed)="closedSpy()" #d></mat-datepicker>
  `,
})
class DatepickerWithEvents {
  selected: Date | null = null;
  openedSpy = jasmine.createSpy('opened spy');
  closedSpy = jasmine.createSpy('closed spy');
  @ViewChild('d', {static: false}) datepicker: MatDatepicker<Date>;
}


@Component({
  template: `
    <input (focus)="d.open()" [matDatepicker]="d">
    <mat-datepicker #d="matDatepicker"></mat-datepicker>
  `,
})
class DatepickerOpeningOnFocus {
  @ViewChild(MatDatepicker, {static: false}) datepicker: MatDatepicker<Date>;
}


@Component({
  template: `
    <input [matDatepicker]="ch">
    <mat-datepicker #ch [calendarHeaderComponent]="customHeaderForDatePicker"></mat-datepicker>
  `,
})
class DatepickerWithCustomHeader {
  @ViewChild('ch', {static: false}) datepicker: MatDatepicker<Date>;
  customHeaderForDatePicker = CustomHeaderForDatepicker;
}

@Component({
  template: `
    <div class="custom-element">Custom element</div>
    <mat-calendar-header></mat-calendar-header>
  `,
})
class CustomHeaderForDatepicker {}

@Component({
  template: `
    <input [matDatepicker]="assignedDatepicker" [value]="date">
    <mat-datepicker #d [touchUi]="touch"></mat-datepicker>
  `,
})
class DelayedDatepicker {
  @ViewChild('d', {static: false}) datepicker: MatDatepicker<Date>;
  @ViewChild(MatDatepickerInput, {static: false}) datepickerInput: MatDatepickerInput<Date>;
  date: Date | null;
  assignedDatepicker: MatDatepicker<Date>;
}


@Component({
  template: `
    <input [matDatepicker]="d">
    <mat-datepicker-toggle tabIndex="7" [for]="d">
      <div class="custom-icon" matDatepickerToggleIcon></div>
    </mat-datepicker-toggle>
    <mat-datepicker #d></mat-datepicker>
  `,
})
class DatepickerWithTabindexOnToggle {}


@Component({
  template: `
    <mat-datepicker-toggle></mat-datepicker-toggle>
  `,
})
class DatepickerToggleWithNoDatepicker {}
