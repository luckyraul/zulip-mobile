/* @flow strict-local */
import type {
  RealmState,
  PerAccountApplicableAction,
  RealmEmojiById,
  VideoChatProvider,
} from '../types';
import {
  CreatePublicOrPrivateStreamPolicy,
  CreateWebPublicStreamPolicy,
} from '../api/permissionsTypes';
import { EventTypes } from '../api/eventTypes';
import {
  REGISTER_COMPLETE,
  EVENT_REALM_EMOJI_UPDATE,
  EVENT,
  EVENT_UPDATE_DISPLAY_SETTINGS,
  EVENT_REALM_FILTERS,
  REFRESH_SERVER_EMOJI_DATA,
  RESET_ACCOUNT_DATA,
} from '../actionConstants';
import { objectFromEntries } from '../jsBackport';
import { objectEntries } from '../flowPonyfill';

const initialState = {
  //
  // InitialDataCustomProfileFields
  //

  customProfileFields: [],

  //
  // InitialDataRealm
  //

  name: '',
  description: '',
  nonActiveUsers: [],
  filters: [],
  emoji: {},
  defaultExternalAccounts: new Map(),
  videoChatProvider: null,
  mandatoryTopics: false,
  messageContentDeleteLimitSeconds: null,
  messageContentEditLimitSeconds: 1,
  pushNotificationsEnabled: true,
  pushNotificationsEnabledEndTimestamp: null,
  createPublicStreamPolicy: CreatePublicOrPrivateStreamPolicy.MemberOrAbove,
  createPrivateStreamPolicy: CreatePublicOrPrivateStreamPolicy.MemberOrAbove,
  webPublicStreamsEnabled: false,
  createWebPublicStreamPolicy: CreateWebPublicStreamPolicy.Nobody,
  enableSpectatorAccess: false,
  waitingPeriodThreshold: 90,
  allowEditHistory: false,
  enableReadReceipts: false,
  emailAddressVisibility: null,
  enableGuestUserIndicator: false,

  //
  // InitialDataRealmUser
  //

  canCreateStreams: true,
  user_id: undefined,
  email: undefined,
  crossRealmBots: [],

  //
  // InitialDataUserSettings
  //

  twentyFourHourTime: false,
  presenceEnabled: false,

  //
  // Misc.: Not in the /register response.
  //

  serverEmojiData: null,
};

const convertRealmEmoji = (data): RealmEmojiById =>
  objectFromEntries(Object.keys(data).map(id => [id, { ...data[id], code: id.toString() }]));

function getVideoChatProvider({
  availableProviders,
  jitsiServerUrl,
  providerId,
}): VideoChatProvider | null {
  // This logic parallels logic in the webapp in static/js/compose.js
  // for interpreting similar data from page_params.
  if (
    availableProviders.jitsi_meet
    && availableProviders.jitsi_meet.id === providerId
    && jitsiServerUrl !== undefined
  ) {
    return { name: 'jitsi_meet', jitsiServerUrl };
  } else {
    return null;
  }
}

export default (
  state: RealmState = initialState, // eslint-disable-line default-param-last
  action: PerAccountApplicableAction,
): RealmState => {
  switch (action.type) {
    case RESET_ACCOUNT_DATA:
      return initialState;

    case REGISTER_COMPLETE: {
      return {
        ...state,

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
        emoji: convertRealmEmoji(action.data.realm_emoji),
        defaultExternalAccounts: new Map(
          objectEntries(action.data.realm_default_external_accounts ?? {}).map(
            ([name, { url_pattern }]) => [name, { url_pattern }],
          ),
        ),

        // TODO: On EventTypes.realm events with video_chat_provider, update
        //   the state or cause a re-register.
        videoChatProvider: getVideoChatProvider({
          availableProviders: action.data.realm_available_video_chat_providers,
          jitsiServerUrl: action.data.jitsi_server_url,
          providerId: action.data.realm_video_chat_provider,
        }),

        // Realm settings.
        // These should each get updated on realm/update_dict events, below.
        mandatoryTopics: action.data.realm_mandatory_topics,
        messageContentDeleteLimitSeconds: action.data.realm_message_content_delete_limit_seconds,
        messageContentEditLimitSeconds: action.data.realm_message_content_edit_limit_seconds,
        pushNotificationsEnabled: action.data.realm_push_notifications_enabled,
        pushNotificationsEnabledEndTimestamp:
          action.data.realm_push_notifications_enabled_end_timestamp ?? null,
        createPublicStreamPolicy:
          action.data.realm_create_public_stream_policy
          ?? action.data.realm_create_stream_policy
          // https://github.com/zulip/zulip-mobile/pull/5394#discussion_r883208179
          ?? CreatePublicOrPrivateStreamPolicy.MemberOrAbove,
        createPrivateStreamPolicy:
          action.data.realm_create_private_stream_policy
          ?? action.data.realm_create_stream_policy
          // https://github.com/zulip/zulip-mobile/pull/5394#discussion_r883208179
          ?? CreatePublicOrPrivateStreamPolicy.MemberOrAbove,
        webPublicStreamsEnabled: action.data.server_web_public_streams_enabled ?? false,
        createWebPublicStreamPolicy:
          action.data.realm_create_web_public_stream_policy ?? CreateWebPublicStreamPolicy.Nobody,
        enableSpectatorAccess: action.data.realm_enable_spectator_access ?? false,
        waitingPeriodThreshold: action.data.realm_waiting_period_threshold,
        allowEditHistory: action.data.realm_allow_edit_history,
        enableReadReceipts: action.data.realm_enable_read_receipts ?? false,
        emailAddressVisibility: action.data.realm_email_address_visibility ?? null,
        enableGuestUserIndicator: action.data.realm_enable_guest_user_indicator ?? true,

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

        twentyFourHourTime:
          action.data.user_settings?.twenty_four_hour_time
          // Fall back to InitialDataUpdateDisplaySettings for servers that
          // don't support the user_settings_object client capability.
          /* $FlowIgnore[incompatible-cast]: If `user_settings` is absent,
             this will be present. */
          ?? (action.data.twenty_four_hour_time: boolean),

        // Let this be null for servers that don't support the
        // user_settings_object client capability. Support begins at FL 89,
        // and we currently don't need this value when the server is pre-89.
        presenceEnabled: action.data.user_settings?.presence_enabled ?? null,
      };
    }

    case REFRESH_SERVER_EMOJI_DATA:
      return {
        ...state,
        serverEmojiData: action.data,
      };

    // TODO on RealmUserUpdateEvent for self: update email, isAdmin, etc.

    case EVENT_REALM_FILTERS:
      return {
        ...state,
        filters: action.realm_filters,
      };

    case EVENT_REALM_EMOJI_UPDATE:
      return {
        ...state,
        emoji: convertRealmEmoji(action.realm_emoji),
      };

    case EVENT_UPDATE_DISPLAY_SETTINGS:
      switch (action.setting_name) {
        case 'twenty_four_hour_time':
          return { ...state, twentyFourHourTime: action.setting };
        default:
          return state;
      }

    case EVENT: {
      const { event } = action;
      switch (event.type) {
        case EventTypes.custom_profile_fields:
          // TODO(server): The API docs suggest that this event just
          //   contains new custom profile fields, but it looks like in fact
          //   it's the new entire list of them.  See chat thread:
          //     https://chat.zulip.org/#narrow/stream/378-api-design/topic/custom.20profile.20fields/near/1382993
          return { ...state, customProfileFields: event.fields };

        case EventTypes.realm:
          if (event.op === 'update_dict') {
            const { data } = event;
            const result = { ...state };

            if (data.name !== undefined) {
              result.name = data.name;
            }
            if (data.description !== undefined) {
              result.description = data.description;
            }
            if (data.mandatory_topics !== undefined) {
              result.mandatoryTopics = data.mandatory_topics;
            }
            if (data.message_content_delete_limit_seconds !== undefined) {
              result.messageContentDeleteLimitSeconds = data.message_content_delete_limit_seconds;
            }
            if (data.message_content_edit_limit_seconds !== undefined) {
              result.messageContentEditLimitSeconds = data.message_content_edit_limit_seconds;
            }
            if (data.push_notifications_enabled !== undefined) {
              result.pushNotificationsEnabled = data.push_notifications_enabled;
            }
            if (data.push_notifications_enabled_end_timestamp !== undefined) {
              result.pushNotificationsEnabledEndTimestamp =
                data.push_notifications_enabled_end_timestamp;
            }
            if (data.create_stream_policy !== undefined) {
              // TODO(server-5.0): Stop expecting create_stream_policy; simplify.
              result.createPublicStreamPolicy = data.create_stream_policy;
              result.createPrivateStreamPolicy = data.create_stream_policy;
            }
            if (data.create_public_stream_policy !== undefined) {
              result.createPublicStreamPolicy = data.create_public_stream_policy;
            }
            if (data.create_private_stream_policy !== undefined) {
              result.createPrivateStreamPolicy = data.create_private_stream_policy;
            }
            // no event updates result.webPublicStreamsEnabled, because it's a server setting
            if (data.create_web_public_stream_policy !== undefined) {
              result.createWebPublicStreamPolicy = data.create_web_public_stream_policy;
            }
            if (data.enable_spectator_access !== undefined) {
              result.enableSpectatorAccess = data.enable_spectator_access;
            }
            if (data.waiting_period_threshold !== undefined) {
              result.waitingPeriodThreshold = data.waiting_period_threshold;
            }
            if (data.allow_edit_history !== undefined) {
              result.allowEditHistory = data.allow_edit_history;
            }
            if (data.enable_read_receipts !== undefined) {
              result.enableReadReceipts = data.enable_read_receipts;
            }
            if (data.email_address_visibility !== undefined) {
              result.emailAddressVisibility = data.email_address_visibility;
            }
            if (data.enable_guest_user_indicator !== undefined) {
              result.enableGuestUserIndicator = data.enable_guest_user_indicator;
            }

            return result;
          }

          // (We've converted any `op: 'update'` events to
          //   `op: 'update_dict'` events near the edge.)
          return state;

        case EventTypes.realm_user: {
          const { person } = event;

          // TODO(flow) teach Flow that the `person.existingUser != null` is redundant
          if (person.is_active === false && person.existingUser != null) {
            return { ...state, nonActiveUsers: [...state.nonActiveUsers, person.existingUser] };
          } else if (person.is_active === true) {
            const nonActiveUsers = state.nonActiveUsers.filter(u => u.user_id !== person.user_id);
            return { ...state, nonActiveUsers };
          }

          return state;
        }

        case EventTypes.user_settings:
          if (event.op === 'update') {
            const { property, value } = event;
            switch (property) {
              case 'twenty_four_hour_time': {
                // $FlowFixMe[incompatible-cast] - fix UserSettingsUpdateEvent
                return { ...state, twentyFourHourTime: (value: boolean) };
              }
              case 'presence_enabled': {
                // $FlowFixMe[incompatible-cast] - fix UserSettingsUpdateEvent
                return { ...state, presenceEnabled: (value: boolean) };
              }

              default:
                return state;
            }
          }

          return state;

        default:
          return state;
      }
    }

    default:
      return state;
  }
};
