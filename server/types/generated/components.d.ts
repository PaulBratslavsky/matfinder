import type { Schema, Struct } from '@strapi/strapi';

export interface ScheduleSession extends Struct.ComponentSchema {
  collectionName: 'components_schedule_sessions';
  info: {
    displayName: 'Session';
    icon: 'clock';
  };
  attributes: {
    classType: Schema.Attribute.Enumeration<
      [
        'fundamentals',
        'all_levels',
        'advanced',
        'open_mat',
        'competition',
        'kids',
        'womens',
      ]
    > &
      Schema.Attribute.Required;
    day: Schema.Attribute.Enumeration<
      ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    > &
      Schema.Attribute.Required;
    endTime: Schema.Attribute.Time & Schema.Attribute.Required;
    notes: Schema.Attribute.String;
    startTime: Schema.Attribute.Time & Schema.Attribute.Required;
    style: Schema.Attribute.Enumeration<['gi', 'nogi', 'both']> &
      Schema.Attribute.Required;
  };
}

export interface SchoolAmenities extends Struct.ComponentSchema {
  collectionName: 'components_school_amenities';
  info: {
    displayName: 'Amenities';
    icon: 'check';
  };
  attributes: {
    airConditioning: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    changingRooms: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    giRental: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    kidsArea: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    parking: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    proShop: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    showers: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
  };
}

export interface SchoolContact extends Struct.ComponentSchema {
  collectionName: 'components_school_contacts';
  info: {
    displayName: 'Contact';
    icon: 'phone';
  };
  attributes: {
    email: Schema.Attribute.Email;
    instagram: Schema.Attribute.String;
    phone: Schema.Attribute.String;
    website: Schema.Attribute.String;
  };
}

export interface SchoolPricing extends Struct.ComponentSchema {
  collectionName: 'components_school_pricings';
  info: {
    displayName: 'Pricing';
    icon: 'priceTag';
  };
  attributes: {
    currency: Schema.Attribute.Enumeration<['USD']> &
      Schema.Attribute.DefaultTo<'USD'>;
    dropInFee: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    dropInNotes: Schema.Attribute.String;
    freeTrial: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    freeTrialNotes: Schema.Attribute.String;
    monthlyMax: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    monthlyMin: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    visitorsWelcome: Schema.Attribute.Boolean;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'schedule.session': ScheduleSession;
      'school.amenities': SchoolAmenities;
      'school.contact': SchoolContact;
      'school.pricing': SchoolPricing;
    }
  }
}
