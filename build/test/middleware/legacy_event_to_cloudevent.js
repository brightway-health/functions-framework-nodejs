"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const sinon = require("sinon");
const legacy_event_to_cloudevent_1 = require("../../src/middleware/legacy_event_to_cloudevent");
const cloudevents_1 = require("../../src/cloudevents");
describe('splitResource', () => {
    const testData = [
        {
            name: 'background resource',
            context: {
                eventType: 'google.storage.object.finalize',
                resource: {
                    service: 'storage.googleapis.com',
                    name: 'projects/_/buckets/some-bucket/objects/folder/Test.cs',
                    type: 'storage#object',
                },
            },
            expectedResult: {
                service: 'storage.googleapis.com',
                resource: 'projects/_/buckets/some-bucket',
                subject: 'objects/folder/Test.cs',
            },
        },
        {
            name: 'background resource without service',
            context: {
                eventType: 'google.storage.object.finalize',
                resource: {
                    name: 'projects/_/buckets/some-bucket/objects/folder/Test.cs',
                    type: 'storage#object',
                },
            },
            expectedResult: {
                service: 'storage.googleapis.com',
                resource: 'projects/_/buckets/some-bucket',
                subject: 'objects/folder/Test.cs',
            },
        },
        {
            name: 'background resource string',
            context: {
                eventType: 'google.storage.object.finalize',
                resource: 'projects/_/buckets/some-bucket/objects/folder/Test.cs',
            },
            expectedResult: {
                service: 'storage.googleapis.com',
                resource: 'projects/_/buckets/some-bucket',
                subject: 'objects/folder/Test.cs',
            },
        },
        {
            name: 'unknown service and event type',
            context: {
                eventType: 'unknown_event_type',
                resource: {
                    service: 'not_a_known_service',
                    name: 'projects/_/my/stuff/at/test.txt',
                    type: 'storage#object',
                },
            },
            expectedResult: {
                service: 'not_a_known_service',
                resource: 'projects/_/my/stuff/at/test.txt',
                subject: '',
            },
        },
    ];
    testData.forEach(test => {
        it(test.name, () => {
            const result = legacy_event_to_cloudevent_1.splitResource(test.context);
            assert.deepStrictEqual(result, test.expectedResult);
        });
    });
    it('throws an exception on unknown event type', () => {
        const context = {
            eventType: 'not_a_known_event_type',
            resource: {
                name: 'projects/_/buckets/some-bucket/objects/folder/Test.cs',
                type: 'storage#object',
            },
        };
        assert.throws(() => legacy_event_to_cloudevent_1.splitResource(context), cloudevents_1.EventConversionError);
    });
    it('throws an exception on unknown resource type', () => {
        const context = {
            eventType: 'google.storage.object.finalize',
            resource: {
                // This name will not match the regex associated with the service.
                name: 'foo/bar/baz',
                service: 'storage.googleapis.com',
                type: 'storage#object',
            },
        };
        assert.throws(() => legacy_event_to_cloudevent_1.splitResource(context), cloudevents_1.EventConversionError);
    });
});
describe('legacyEventToCloudEventMiddleware', () => {
    const createLegacyEventBody = (eventType, resource, data = { data: '10' }) => ({
        context: {
            eventId: '1215011316659232',
            timestamp: '2020-05-18T12:13:19Z',
            eventType,
            resource,
        },
        data,
    });
    const createCloudEventBody = (type, source, data, subject) => Object.assign(subject ? { subject } : {}, {
        specversion: '1.0',
        id: '1215011316659232',
        time: '2020-05-18T12:13:19Z',
        datacontenttype: 'application/json',
        type,
        source,
        data,
    });
    const testData = [
        {
            name: 'CloudEvent',
            body: {
                specversion: '1.0',
                type: 'com.google.cloud.storage',
                source: 'https://github.com/GoogleCloudPlatform/functions-framework-nodejs',
                subject: 'test-subject',
                id: 'test-1234-1234',
                time: '2020-05-13T01:23:45Z',
                datacontenttype: 'application/json',
                data: {
                    some: 'payload',
                },
            },
            expectedCloudEvent: {
                specversion: '1.0',
                type: 'com.google.cloud.storage',
                source: 'https://github.com/GoogleCloudPlatform/functions-framework-nodejs',
                subject: 'test-subject',
                id: 'test-1234-1234',
                time: '2020-05-13T01:23:45Z',
                datacontenttype: 'application/json',
                data: {
                    some: 'payload',
                },
            },
        },
        {
            name: 'PubSub request',
            body: createLegacyEventBody('google.pubsub.topic.publish', {
                service: 'pubsub.googleapis.com',
                name: 'projects/sample-project/topics/gcf-test',
                type: 'type.googleapis.com/google.pubsub.v1.PubsubMessage',
            }),
            expectedCloudEvent: createCloudEventBody('google.cloud.pubsub.topic.v1.messagePublished', '//pubsub.googleapis.com/projects/sample-project/topics/gcf-test', {
                message: {
                    data: '10',
                },
            }),
        },
        {
            name: 'Legacy PubSub request',
            body: createLegacyEventBody('providers/cloud.pubsub/eventTypes/topic.publish', 'projects/sample-project/topics/gcf-test'),
            expectedCloudEvent: createCloudEventBody('google.cloud.pubsub.topic.v1.messagePublished', '//pubsub.googleapis.com/projects/sample-project/topics/gcf-test', {
                message: {
                    data: '10',
                },
            }),
        },
        {
            name: 'Firebase auth event',
            body: createLegacyEventBody('providers/firebase.auth/eventTypes/user.create', 'projects/my-project-id', {
                email: 'test@nowhere.com',
                metadata: {
                    createdAt: '2020-05-26T10:42:27Z',
                    lastSignedInAt: '2020-10-24T11:00:00Z',
                },
                uid: 'UUpby3s4spZre6kHsgVSPetzQ8l2',
            }),
            expectedCloudEvent: createCloudEventBody('google.firebase.auth.user.v1.created', '//firebaseauth.googleapis.com/projects/my-project-id', {
                email: 'test@nowhere.com',
                metadata: {
                    createTime: '2020-05-26T10:42:27Z',
                    lastSignInTime: '2020-10-24T11:00:00Z',
                },
                uid: 'UUpby3s4spZre6kHsgVSPetzQ8l2',
            }, 'users/UUpby3s4spZre6kHsgVSPetzQ8l2'),
        },
    ];
    testData.forEach(test => {
        it(test.name, () => {
            const next = sinon.spy();
            const req = {
                body: test.body,
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                header: (_) => '',
            };
            legacy_event_to_cloudevent_1.legacyEventToCloudEventMiddleware(req, {}, next);
            assert.deepStrictEqual(req.body, test.expectedCloudEvent);
            assert.strictEqual(next.called, true);
        });
    });
});
//# sourceMappingURL=legacy_event_to_cloudevent.js.map