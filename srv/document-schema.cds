using {docinfoextraction} from '../db/schema';

service DocumentExtractionService {
    entity HeaderFields   as projection on docinfoextraction.HeaderFields;
    entity LineItemFields as projection on docinfoextraction.LineItemFields;
    entity Jobs           as projection on docinfoextraction.Jobs;
    entity Documents      as projection on docinfoextraction.Documents;
    function jobTrigger(ID : UUID) returns String;

    function getDetails(ID : UUID) returns {
        header : HeaderField;
        lineItems : many LineItemField;
    };

    type HeaderField {
        ID        : UUID;
        FirstName : String;
        LastName  : String;
        degree    : String;
        email     : String;
        phone     : String;
    }

    type LineItemField {
        ID       : UUID;
        Name     : String;
        Position : String;
        location : String;
        Duration : String;
    }


}
