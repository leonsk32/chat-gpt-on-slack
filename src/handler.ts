import { App, AwsLambdaReceiver } from "@slack/bolt"
import {
  AwsCallback,
  AwsEvent,
} from "@slack/bolt/dist/receivers/AwsLambdaReceiver"
import Lambda from "aws-lambda"
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai"

const SYSTEM_MESSAGE_PREFIX = ":writing_hand:"
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET
const SLACK_BOT_USER_OAUTH_TOKEN = process.env.SLACK_BOT_USER_OAUTH_TOKEN
const SLACK_BOT_MEMBER_ID = process.env.SLACK_BOT_MEMBER_ID
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

const receiver = new AwsLambdaReceiver({
  signingSecret: SLACK_SIGNING_SECRET ?? "",
})

const app = new App({
  token: SLACK_BOT_USER_OAUTH_TOKEN,
  receiver,
})

const configuration = new Configuration({
  apiKey: OPENAI_API_KEY ?? "",
})
const openAiApi = new OpenAIApi(configuration)

app.event("app_mention", async ({ event, context, client, say }) => {
  if (context.retryNum) {
    console.log("skip retry")
    return
  }

  console.log(event)
  const { channel, thread_ts, event_ts } = event
  // thread_ts is undefined when the event is not a thread
  const timestamp = thread_ts ?? event_ts

  await say({
    channel,
    thread_ts: timestamp,
    text: `${SYSTEM_MESSAGE_PREFIX} I'm thinking...`,
  })

  const replies = await client.conversations.replies({
    channel,
    ts: timestamp,
  })

  const requestMessages: ChatCompletionRequestMessage[] =
    replies.messages?.reduce(
      (messages: ChatCompletionRequestMessage[], message) => {
        const { text, user } = message
        if (!text) return messages

        if (user !== SLACK_BOT_MEMBER_ID) {
          messages.push({
            role: "user",
            content: text.replace(`<@${SLACK_BOT_MEMBER_ID}>`, ""),
          })
          return messages
        }

        if (!text.startsWith(SYSTEM_MESSAGE_PREFIX)) {
          messages.push({
            role: "assistant",
            content: text,
          })
          return messages
        }

        return messages
      },
      []
    ) ?? []

  try {
    const completion = await openAiApi.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: requestMessages,
    })
    const outputText = completion.data.choices
      .map(({ message }) => message?.content ?? "")
      .join("")
    await client.chat.postMessage({
      channel,
      thread_ts: timestamp,
      text: outputText,
    })
  } catch (e) {
    console.log(e)
    await client.chat.postMessage({
      channel,
      thread_ts: timestamp,
      text: `${SYSTEM_MESSAGE_PREFIX} something went wrong...\n${e}`,
    })
  }
})

export async function main(
  event: AwsEvent,
  context: Lambda.Context,
  callback: AwsCallback
): Promise<Lambda.APIGatewayProxyResult> {
  const handler = await receiver.start()
  return handler(event, context, callback)
}
