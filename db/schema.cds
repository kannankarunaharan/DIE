using {managed} from '@sap/cds/common';

namespace docinfoextraction;

entity HeaderFields {
    key ID        : UUID;
        FirstName : String;
        LastName  : String;
        degree    : String;
        email     : String;
        phone     : String;
}

entity LineItemFields {
    key ID        : UUID;
        Name      : String;
        Position  : String;
        location  : String;
        Duration  : String;
        // Relation to HeaderFields
        header_ID : Association to HeaderFields;
}

@readonly
entity Jobs {
    key id           : UUID;
        status       : String;
        fileName     : String;
        documentType : String;
        created      : Timestamp;
        finished     : Timestamp;
        clientId     : String;
}


entity Documents : managed {
    key id        : UUID;
        extractId : UUID;

        @Core: {
            ContentDisposition: {
                $Type   : 'Core.ContentDispositionType',
                Filename: fileName
            },
            MediaType         : mediaType,
        }
        content   : LargeBinary;
        fileName  : String;

        @Core: {IsMediaType: true}
        mediaType : String;
        url       : String;
}
