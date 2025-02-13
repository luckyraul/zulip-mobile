/* @flow strict-local */
import deepFreeze from 'deep-freeze';
import invariant from 'invariant';

import type { RealmState } from '../../types';
import realmReducer from '../realmReducer';
import {
  EVENT_REALM_EMOJI_UPDATE,
  EVENT_UPDATE_DISPLAY_SETTINGS,
  EVENT_REALM_FILTERS,
  EVENT,
} from '../../actionConstants';
import type { UserSettings } from '../../api/modelTypes';
import type { RealmDataForUpdate } from '../../api/realmDataTypes';
import {
  CreatePublicOrPrivateStreamPolicy,
  CreateWebPublicStreamPolicy,
  EmailAddressVisibility,
} from '../../api/permissionsTypes';
import { CustomProfileFieldType } from '../../api/modelTypes';
import { EventTypes } from '../../api/eventTypes';
import * as eg from '../../__tests__/lib/exampleData';
import eventToAction from '../../events/eventToAction';

const labelFromValue = value =>
  /* $FlowFixMe[incompatible-use] - CreateWebPublicStreamPolicy is a
     Flow enum. Values are numbers, so they do have .toString…but
     Flow reasonably hides that detail from consumers. For
     CreateWebPublicStreamPolicy, it would actually be better to use
     CreateWebPublicStreamPolicy.getName(initialStateValue), if we
     find a nice way to write that with type checking. */
  value?.toString() ?? '[nullish]';

describe('realmReducer', () => {
  describe('REGISTER_COMPLETE', () => {
    test('updates as appropriate on a boring but representative REGISTER_COMPLETE', () => {
      const action = eg.action.register_complete;
      expect(realmReducer(eg.baseReduxState.realm, action)).toEqual({
        //
        // InitialDataCustomProfileFields
        //

        customProfileFields: action.data.custom_profile_fields,

        //
        // InitialDataRealm
        //

        name: action.data.realm_name,
        description: action.data.realm_description,
        nonActiveUsers: action.data.realm_non_active_users,
        filters: action.data.realm_filters,
        emoji: {}, // update as necessary if example data changes
        defaultExternalAccounts: new Map([
          [
            'github',
            { url_pattern: action.data.realm_default_external_accounts?.github.url_pattern },
          ],
        ]),
        videoChatProvider: null, // update as necessary if example data changes
        mandatoryTopics: action.data.realm_mandatory_topics,
        messageContentDeleteLimitSeconds: action.data.realm_message_content_delete_limit_seconds,
        messageContentEditLimitSeconds: action.data.realm_message_content_edit_limit_seconds,
        pushNotificationsEnabled: action.data.realm_push_notifications_enabled,
        pushNotificationsEnabledEndTimestamp:
          action.data.realm_push_notifications_enabled_end_timestamp,
        webPublicStreamsEnabled: action.data.server_web_public_streams_enabled,
        createPublicStreamPolicy: action.data.realm_create_public_stream_policy,
        createPrivateStreamPolicy: action.data.realm_create_private_stream_policy,
        createWebPublicStreamPolicy: action.data.realm_create_web_public_stream_policy,
        enableSpectatorAccess: action.data.realm_enable_spectator_access,
        waitingPeriodThreshold: action.data.realm_waiting_period_threshold,
        allowEditHistory: action.data.realm_allow_edit_history,
        enableReadReceipts: action.data.realm_enable_read_receipts,
        emailAddressVisibility: null,
        enableGuestUserIndicator: true,

        //
        // InitialDataRealmUser
        //

        canCreateStreams: action.data.can_create_streams,
        user_id: action.data.user_id,
        email: action.data.email,
        crossRealmBots: action.data.cross_realm_bots,

        //
        // InitialDataUserSettings
        //

        /* $FlowIgnore[incompatible-use] - testing modern servers, which
           send user_settings. */
        twentyFourHourTime: action.data.user_settings.twenty_four_hour_time,
        // $FlowIgnore[incompatible-use] - see above
        presenceEnabled: action.data.user_settings.presence_enabled,

        //
        // Misc.: Not in the /register response. (These should be unchanged.)
        //

        serverEmojiData: eg.baseReduxState.realm.serverEmojiData,
      });
    });
  });

  describe('RESET_ACCOUNT_DATA', () => {
    test('resets state', () => {
      const initialState = eg.plusReduxState.realm;

      const expectedState = eg.baseReduxState.realm;

      const actualState = realmReducer(initialState, eg.action.reset_account_data);

      expect(actualState).toEqual(expectedState);
    });
  });

  describe('EVENT_UPDATE_DISPLAY_SETTINGS', () => {
    test('change the display settings', () => {
      const initialState = eg.reduxStatePlus({
        realm: {
          ...eg.plusReduxState.realm,
          twentyFourHourTime: false,
          emoji: {
            customEmoji1: {
              code: 'customEmoji1',
              deactivated: false,
              name: 'Custom Emoji 1',
              source_url: 'https://emoji.zulip.invalid/?id=custom1',
            },
          },
        },
      }).realm;

      const action = deepFreeze({
        type: EVENT_UPDATE_DISPLAY_SETTINGS,
        id: 1,
        setting: true,
        setting_name: 'twenty_four_hour_time',
      });

      const expectedState = {
        ...initialState,
        twentyFourHourTime: true,
      };

      const actualState = realmReducer(initialState, action);

      expect(actualState).toEqual(expectedState);
    });
  });

  describe('EVENT_REALM_EMOJI_UPDATE', () => {
    test('update state to new realm_emoji', () => {
      const initialState = eg.reduxStatePlus({
        realm: {
          ...eg.plusReduxState.realm,
          twentyFourHourTime: false,
          emoji: {},
          filters: [],
        },
      }).realm;

      const action = deepFreeze({
        id: 4,
        realm_emoji: {
          customEmoji1: {
            code: 'customEmoji1',
            deactivated: false,
            name: 'Custom Emoji 1',
            source_url: 'https://emoji.zulip.invalid/?id=custom1',
          },
          customEmoji2: {
            code: 'customEmoji2',
            deactivated: false,
            name: 'Custom Emoji 2',
            source_url: 'https://emoji.zulip.invalid/?id=custom2',
          },
        },
        type: EVENT_REALM_EMOJI_UPDATE,
      });

      const expectedState = {
        ...initialState,
        emoji: {
          customEmoji1: {
            code: 'customEmoji1',
            deactivated: false,
            name: 'Custom Emoji 1',
            source_url: 'https://emoji.zulip.invalid/?id=custom1',
          },
          customEmoji2: {
            code: 'customEmoji2',
            deactivated: false,
            name: 'Custom Emoji 2',
            source_url: 'https://emoji.zulip.invalid/?id=custom2',
          },
        },
      };

      const newState = realmReducer(initialState, action);

      expect(newState).toEqual(expectedState);
    });
  });

  describe('EVENT_REALM_FILTERS', () => {
    test('update state to new realm_filter', () => {
      const initialState = eg.reduxStatePlus({
        realm: {
          ...eg.plusReduxState.realm,
          twentyFourHourTime: false,
          emoji: {},
          filters: [],
        },
      }).realm;

      const action = deepFreeze({
        id: 4,
        realm_filters: [['#(?P<id>[0-9]+)', 'https://github.com/zulip/zulip/issues/%(id)s', 2]],
        type: EVENT_REALM_FILTERS,
      });

      const expectedState = {
        ...initialState,
        filters: [['#(?P<id>[0-9]+)', 'https://github.com/zulip/zulip/issues/%(id)s', 2]],
      };

      const newState = realmReducer(initialState, action);

      expect(newState).toEqual(expectedState);
    });
  });

  describe('EVENT', () => {
    /**
     * The part of RealmState that we expect to test EVENT actions on.
     */
    type EventUpdatableRealmState = $Rest<
      RealmState,
      {|
        serverEmojiData: mixed,

        // Incomplete; add others as needed to satisfy Flow.
      |},
    >;

    describe('type `custom_profile_fields`', () => {
      const mkState = fields =>
        deepFreeze({ ...eg.plusReduxState.realm, customProfileFields: fields });
      const mkAction = fields =>
        deepFreeze({
          type: EVENT,
          event: { id: 0, type: EventTypes.custom_profile_fields, fields },
        });
      const mkField = props => ({
        type: CustomProfileFieldType.ShortText,
        hint: '',
        field_data: '',
        ...props,
      });

      test('add from none', () => {
        const field = mkField({ id: 0, order: 0, name: 'thing' });
        expect(realmReducer(mkState([]), mkAction([field]))).toEqual(mkState([field]));
      });

      test('remove all', () => {
        const field = mkField({ id: 0, order: 0, name: 'thing' });
        expect(realmReducer(mkState([field]), mkAction([]))).toEqual(mkState([]));
      });

      test('update, delete, remove', () => {
        const field0 = mkField({ id: 12, order: 0, name: 'thing' });
        const field1 = mkField({ id: 3, order: 1, name: 'other thing' });

        const field2 = mkField({ id: 42, order: 0, name: 'new thing' });
        const field0a = mkField({ id: field0.id, order: 1, name: 'thing again' });

        expect(realmReducer(mkState([field0, field1]), mkAction([field2, field0a]))).toEqual(
          mkState([field2, field0a]),
        );
      });
    });

    describe('type `user_settings`, op `update`', () => {
      const eventCommon = { id: 0, type: EventTypes.user_settings, op: 'update' };

      const mkCheck =
        <S: $Keys<EventUpdatableRealmState>, E: $Keys<UserSettings>>(
          statePropertyName: S,
          eventPropertyName: E,
        ): ((RealmState[S], UserSettings[E]) => void) =>
        (initialStateValue, eventValue) => {
          test(`${labelFromValue(initialStateValue)} → ${labelFromValue(eventValue)}`, () => {
            const initialState = { ...eg.plusReduxState.realm };
            // $FlowFixMe[prop-missing]
            // $FlowFixMe[class-object-subtyping]
            /* $FlowFixMe[incompatible-type]: Trust that the caller passed the
               right kind of value for its chosen key. */
            initialState[statePropertyName] = initialStateValue;

            const expectedState = { ...initialState };
            /* $FlowFixMe[incompatible-type]: Trust that the caller passed the
               right kind of value for its chosen key. */
            expectedState[statePropertyName] = eventValue;

            expect(
              realmReducer(initialState, {
                type: EVENT,
                event: { ...eventCommon, property: eventPropertyName, value: eventValue },
              }),
            ).toEqual(expectedState);
          });
        };

      describe('twentyFourHourTime / twenty_four_hour_time', () => {
        const check = mkCheck('twentyFourHourTime', 'twenty_four_hour_time');
        check(true, true);
        check(true, false);
        check(false, true);
        check(false, false);
      });

      describe('presenceEnabled / presence_enabled', () => {
        const check = mkCheck('presenceEnabled', 'presence_enabled');
        check(true, true);
        check(true, false);
        check(false, true);
        check(false, false);
      });
    });

    describe('type `realm`, op `update_dict`', () => {
      const eventCommon = { id: 0, type: EventTypes.realm, op: 'update_dict', property: 'default' };

      const mkCheck =
        <S: $Keys<EventUpdatableRealmState>, E: $Keys<RealmDataForUpdate>>(
          statePropertyName: S,
          eventPropertyName: E,
        ): ((RealmState[S], RealmDataForUpdate[E]) => void) =>
        (initialStateValue, eventValue) => {
          test(`${labelFromValue(initialStateValue)} → ${labelFromValue(eventValue)}`, () => {
            const initialState = { ...eg.plusReduxState.realm };
            // $FlowFixMe[prop-missing]
            // $FlowFixMe[class-object-subtyping]
            /* $FlowFixMe[incompatible-type]: Trust that the caller passed the
               right kind of value for its chosen key. */
            initialState[statePropertyName] = initialStateValue;

            const expectedState = { ...initialState };
            /* $FlowFixMe[incompatible-type]: Trust that the caller passed the
               right kind of value for its chosen key. */
            expectedState[statePropertyName] = eventValue;

            expect(
              realmReducer(initialState, {
                type: EVENT,
                event: {
                  ...eventCommon,
                  // $FlowFixMe[invalid-computed-prop]
                  data: { [eventPropertyName]: eventValue },
                },
              }),
            ).toEqual(expectedState);
          });
        };

      describe('name / name', () => {
        const check = mkCheck('name', 'name');
        check('foo', 'foo');
        check('foo', 'bar');
      });

      describe('description / description', () => {
        const check = mkCheck('description', 'description');
        check('foo', 'foo');
        check('foo', 'bar');
      });

      describe('mandatoryTopics / mandatory_topics', () => {
        const check = mkCheck('mandatoryTopics', 'mandatory_topics');
        check(true, true);
        check(true, false);
        check(false, true);
        check(false, false);
      });

      describe('messageContentDeleteLimitSeconds / message_content_delete_limit_seconds', () => {
        const check = mkCheck(
          'messageContentDeleteLimitSeconds',
          'message_content_delete_limit_seconds',
        );
        check(900, 900);
        check(900, 300);
      });

      describe('messageContentEditLimitSeconds / message_content_edit_limit_seconds', () => {
        const check = mkCheck(
          'messageContentEditLimitSeconds',
          'message_content_edit_limit_seconds',
        );
        check(900, 900);
        check(900, 300);
      });

      describe('pushNotificationsEnabled / push_notifications_enabled', () => {
        const check = mkCheck('pushNotificationsEnabled', 'push_notifications_enabled');
        check(true, true);
        check(true, false);
        check(false, true);
        check(false, false);
      });

      describe('pushNotificationsEnabledEndTimestamp / push_notifications_enabled_end_timestamp', () => {
        const check = mkCheck(
          'pushNotificationsEnabledEndTimestamp',
          'push_notifications_enabled_end_timestamp',
        );
        check(123, null);
        check(null, 123);
        check(123, 234);
      });

      describe('create{Private,Public}StreamPolicy / create_stream_policy', () => {
        // TODO(server-5.0): Stop expecting create_stream_policy; remove.

        const { MemberOrAbove, AdminOrAbove, FullMemberOrAbove, ModeratorOrAbove } =
          CreatePublicOrPrivateStreamPolicy;
        const check = (initialStateValue, eventValue) => {
          test(`${initialStateValue.toString()} → ${eventValue.toString()}`, () => {
            const initialState = {
              ...eg.plusReduxState.realm,
              createPublicStreamPolicy: initialStateValue,
              createPrivateStreamPolicy: initialStateValue,
            };

            expect(
              realmReducer(initialState, {
                type: EVENT,
                event: { ...eventCommon, data: { create_stream_policy: eventValue } },
              }),
            ).toEqual({
              ...initialState,
              createPublicStreamPolicy: eventValue,
              createPrivateStreamPolicy: eventValue,
            });
          });
        };

        check(MemberOrAbove, AdminOrAbove);
        check(MemberOrAbove, FullMemberOrAbove);
        check(MemberOrAbove, ModeratorOrAbove);
        check(AdminOrAbove, MemberOrAbove);
        check(AdminOrAbove, FullMemberOrAbove);
        check(AdminOrAbove, ModeratorOrAbove);
        check(FullMemberOrAbove, MemberOrAbove);
        check(FullMemberOrAbove, AdminOrAbove);
        check(FullMemberOrAbove, ModeratorOrAbove);
        check(ModeratorOrAbove, MemberOrAbove);
        check(ModeratorOrAbove, AdminOrAbove);
        check(ModeratorOrAbove, FullMemberOrAbove);
      });

      describe('createPublicStreamPolicy / create_public_stream_policy', () => {
        const { MemberOrAbove, AdminOrAbove, FullMemberOrAbove, ModeratorOrAbove } =
          CreatePublicOrPrivateStreamPolicy;
        const check = mkCheck('createPublicStreamPolicy', 'create_public_stream_policy');
        check(MemberOrAbove, AdminOrAbove);
        check(MemberOrAbove, FullMemberOrAbove);
        check(MemberOrAbove, ModeratorOrAbove);
        check(AdminOrAbove, MemberOrAbove);
        check(AdminOrAbove, FullMemberOrAbove);
        check(AdminOrAbove, ModeratorOrAbove);
        check(FullMemberOrAbove, MemberOrAbove);
        check(FullMemberOrAbove, AdminOrAbove);
        check(FullMemberOrAbove, ModeratorOrAbove);
        check(ModeratorOrAbove, MemberOrAbove);
        check(ModeratorOrAbove, AdminOrAbove);
        check(ModeratorOrAbove, FullMemberOrAbove);
      });

      describe('createPrivateStreamPolicy / create_private_stream_policy', () => {
        const { MemberOrAbove, AdminOrAbove, FullMemberOrAbove, ModeratorOrAbove } =
          CreatePublicOrPrivateStreamPolicy;
        const check = mkCheck('createPrivateStreamPolicy', 'create_private_stream_policy');
        check(MemberOrAbove, AdminOrAbove);
        check(MemberOrAbove, FullMemberOrAbove);
        check(MemberOrAbove, ModeratorOrAbove);
        check(AdminOrAbove, MemberOrAbove);
        check(AdminOrAbove, FullMemberOrAbove);
        check(AdminOrAbove, ModeratorOrAbove);
        check(FullMemberOrAbove, MemberOrAbove);
        check(FullMemberOrAbove, AdminOrAbove);
        check(FullMemberOrAbove, ModeratorOrAbove);
        check(ModeratorOrAbove, MemberOrAbove);
        check(ModeratorOrAbove, AdminOrAbove);
        check(ModeratorOrAbove, FullMemberOrAbove);
      });

      describe('createWebPublicStreamPolicy / create_web_public_stream_policy', () => {
        const { AdminOrAbove, ModeratorOrAbove, Nobody, OwnerOnly } = CreateWebPublicStreamPolicy;
        const check = mkCheck('createWebPublicStreamPolicy', 'create_web_public_stream_policy');
        check(AdminOrAbove, ModeratorOrAbove);
        check(AdminOrAbove, Nobody);
        check(AdminOrAbove, OwnerOnly);
        check(ModeratorOrAbove, AdminOrAbove);
        check(ModeratorOrAbove, Nobody);
        check(ModeratorOrAbove, OwnerOnly);
        check(Nobody, AdminOrAbove);
        check(Nobody, ModeratorOrAbove);
        check(Nobody, OwnerOnly);
        check(OwnerOnly, AdminOrAbove);
        check(OwnerOnly, ModeratorOrAbove);
        check(OwnerOnly, Nobody);
      });

      describe('enableSpectatorAccess / enable_spectator_access', () => {
        const check = mkCheck('enableSpectatorAccess', 'enable_spectator_access');
        check(true, true);
        check(true, false);
        check(false, true);
        check(false, false);
      });

      describe('waitingPeriodThreshold / waiting_period_threshold', () => {
        const check = mkCheck('waitingPeriodThreshold', 'waiting_period_threshold');
        check(90, 90);
        check(90, 30);
      });

      describe('allowEditHistory / allow_edit_history', () => {
        const check = mkCheck('allowEditHistory', 'allow_edit_history');
        check(true, true);
        check(true, false);
        check(false, true);
        check(false, false);
      });

      describe('enableReadReceipts / enable_read_receipts', () => {
        const check = mkCheck('enableReadReceipts', 'enable_read_receipts');
        check(true, true);
        check(true, false);
        check(false, true);
        check(false, false);
      });

      describe('emailAddressVisibility / email_address_visibility', () => {
        const { Everyone, Members, Admins, Nobody, Moderators } = EmailAddressVisibility;
        const check = mkCheck('emailAddressVisibility', 'email_address_visibility');
        check(Everyone, Members);
        check(Everyone, Admins);
        check(Everyone, Nobody);
        check(Everyone, Moderators);
        check(Members, Everyone);
        check(Members, Admins);
        check(Members, Nobody);
        check(Members, Moderators);
        check(Admins, Everyone);
        check(Admins, Members);
        check(Admins, Nobody);
        check(Admins, Moderators);
        check(Nobody, Everyone);
        check(Nobody, Admins);
        check(Nobody, Members);
        check(Nobody, Moderators);
        check(Moderators, Everyone);
        check(Moderators, Admins);
        check(Moderators, Members);
        check(Moderators, Nobody);
      });

      describe('enableGuestUserIndicator / enable_guest_user_indicator', () => {
        const check = mkCheck('enableGuestUserIndicator', 'enable_guest_user_indicator');
        check(true, true);
        check(true, false);
        check(false, true);
        check(false, false);
      });
    });

    describe('type `realm_user`, op `update`', () => {
      test('User is deactivated', () => {
        const user = eg.makeUser();

        const event = {
          id: 0,
          type: 'realm_user',
          op: 'update',
          person: { user_id: user.user_id, is_active: false },
        };

        const prevRealmState = { ...eg.plusReduxState.realm, nonActiveUsers: [] };
        const prevPerAccountState = eg.reduxStatePlus({ users: [user], realm: prevRealmState });
        const action = eventToAction(prevPerAccountState, event);
        expect(action).not.toBeNull();
        invariant(action != null, 'action not null');

        const actualState = realmReducer(prevRealmState, action);
        expect(actualState.nonActiveUsers).toEqual([user]);
      });

      test('User is reactivated', () => {
        const user = eg.makeUser();

        const event = {
          id: 0,
          type: 'realm_user',
          op: 'update',
          person: { user_id: user.user_id, is_active: true },
        };

        const prevRealmState = { ...eg.plusReduxState.realm, nonActiveUsers: [user] };
        const prevPerAccountState = eg.reduxStatePlus({ users: [], realm: prevRealmState });
        const action = eventToAction(prevPerAccountState, event);
        expect(action).not.toBeNull();
        invariant(action != null, 'action not null');

        const actualState = realmReducer(prevRealmState, action);
        expect(actualState.nonActiveUsers).toEqual([]);
      });
    });
  });
});
