import dayjs from 'dayjs'
import { marked } from 'marked'
import { FC, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  Container,
  createStyles,
  Group,
  Stack,
  Text,
  Title,
  TypographyStylesProvider,
  Center,
  Alert,
  Badge,
  BackgroundImage,
  Anchor,
} from '@mantine/core'
import { useScrollIntoView } from '@mantine/hooks'
import { useModals } from '@mantine/modals'
import { showNotification } from '@mantine/notifications'
import { mdiAlertCircle, mdiCheck, mdiFlagOutline, mdiTimerSand } from '@mdi/js'
import { Icon } from '@mdi/react'
import CustomProgress from '@Components/CustomProgress'
import WithNavBar from '@Components/WithNavbar'
import { showErrorNotification } from '@Utils/ApiErrorHandler'
import { usePageTitle } from '@Utils/PageTitle'
import { useTypographyStyles } from '@Utils/ThemeOverride'
import api, { ParticipationStatus } from '@Api'

const useStyles = createStyles((theme) => ({
  root: {
    position: 'relative',
    display: 'flex',
    background: theme.colorScheme === 'dark' ? ` rgba(0,0,0,0.2)` : theme.white,
    justifyContent: 'center',
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
    padding: `${theme.spacing.xl * 3}px 0`,

    [theme.fn.smallerThan('sm')]: {
      justifyContent: 'start',
    },
  },
  container: {
    position: 'relative',
    maxWidth: '960px',
    width: '100%',
    zIndex: 1,

    [theme.fn.smallerThan('md')]: {
      padding: `${theme.spacing.md}px ${theme.spacing.md * 2}px`,
    },
  },
  flexGrowAtSm: {
    flexGrow: 0,

    [theme.fn.smallerThan('sm')]: {
      flexGrow: 1,
    },
  },
  description: {
    color: theme.white,
    maxWidth: 600,
  },
  title: {
    color: theme.colorScheme === 'dark' ? theme.colors.white[0] : theme.colors.gray[6],
    fontSize: 50,
    fontWeight: 900,
    lineHeight: 1.1,

    [theme.fn.smallerThan('md')]: {
      maxWidth: '100%',
      fontSize: 34,
      lineHeight: 1.15,
    },
  },
  content: {
    minHeight: '100vh',
    paddingTop: '1rem',
  },
  banner: {
    maxWidth: '50%',
    height: '100%',
    width: '40vw',

    [theme.fn.smallerThan('sm')]: {
      display: 'none',
    },
  },
  date: {
    color: theme.colorScheme === 'dark' ? theme.colors.white[0] : theme.colors.gray[6],
  },
}))

const GameAlertMap = new Map([
  [
    ParticipationStatus.Pending,
    {
      color: 'yellow',
      icon: mdiTimerSand,
      label: '您的队伍已成功报名',
      content: '请耐心等待审核结果',
    },
  ],
  [ParticipationStatus.Accepted, null],
  [
    ParticipationStatus.Denied,
    {
      color: 'red',
      icon: mdiAlertCircle,
      label: '您的参赛申请未通过',
      content: '请确保参赛资格和要求后重新报名',
    },
  ],
  [
    ParticipationStatus.Forfeited,
    {
      color: 'red',
      icon: mdiAlertCircle,
      label: '您的队伍已被禁赛',
      content: '如有异议，请联系管理员进行申诉',
    },
  ],
  [ParticipationStatus.Unsubmitted, null],
])

const GameActionMap = new Map([
  [ParticipationStatus.Pending, '等待审核'],
  [ParticipationStatus.Accepted, '通过审核'],
  [ParticipationStatus.Denied, '重新报名'],
  [ParticipationStatus.Forfeited, '通过审核'],
  [ParticipationStatus.Unsubmitted, '报名参赛'],
])

const GetAlert = (status: ParticipationStatus) => {
  const data = GameAlertMap.get(status)
  if (data) {
    return (
      <Alert color={data.color} icon={<Icon path={data.icon} />} title={data.label}>
        {data.content}
      </Alert>
    )
  }
  return null
}

const GameDetail: FC = () => {
  const { id } = useParams()
  const numId = parseInt(id ?? '-1')
  const navigate = useNavigate()

  const {
    data: game,
    error,
    mutate,
  } = api.game.useGameGames(numId, {
    refreshInterval: 0,
    revalidateOnFocus: false,
  })

  const { classes, theme } = useStyles()
  const { classes: typographyClasses } = useTypographyStyles()

  const startTime = dayjs(game?.start) ?? dayjs()
  const endTime = dayjs(game?.end) ?? dayjs()

  const duriation = endTime.diff(startTime, 'minute')
  const current = dayjs().diff(startTime, 'minute')

  const finished = current > duriation
  const started = current > 0
  const progress = started ? (finished ? 100 : current / duriation) : 0

  const { data: user } = api.account.useAccountProfile({
    refreshInterval: 0,
    revalidateIfStale: false,
    revalidateOnFocus: false,
  })

  usePageTitle(game?.title)

  useEffect(() => {
    if (error) {
      showErrorNotification(error)
      navigate('/games')
    }
  }, [error])

  const { scrollIntoView, targetRef } = useScrollIntoView<HTMLDivElement>()

  useEffect(() => scrollIntoView({ alignment: 'center' }), [])

  const status = game?.status ?? ParticipationStatus.Unsubmitted
  const modals = useModals()

  const onSubmit = () => {
    api.game
      .gameJoinGame(numId ?? 0)
      .then(() => {
        showNotification({
          color: 'teal',
          message: '成功报名，请等待审核',
          icon: <Icon path={mdiCheck} size={1} />,
          disallowClose: true,
        })
        mutate()
      })
      .catch(showErrorNotification)
  }

  const canSubmit =
    (status === ParticipationStatus.Unsubmitted || status === ParticipationStatus.Denied) &&
    !finished &&
    user &&
    user.ownTeamId &&
    user.activeTeamId === user.ownTeamId

  const teamRequire =
    user &&
    status === ParticipationStatus.Unsubmitted &&
    !finished &&
    (!user?.activeTeamId || user?.activeTeamId !== user?.ownTeamId)

  const ControlButtons = (
    <>
      <Button
        disabled={!canSubmit}
        onClick={() => {
          modals.openConfirmModal({
            title: '确认报名',
            children: (
              <Stack spacing="xs">
                <Text size="sm">你确定要报名此比赛吗？</Text>
                <Text size="sm">
                  报名参赛后当前队伍将被锁定，不能再进行人员变动。即邀请、踢出队员。队伍将在比赛结束后或驳回请求时解锁。
                </Text>
              </Stack>
            ),
            onConfirm: onSubmit,
            centered: true,
            labels: { confirm: '确认报名', cancel: '取消' },
            confirmProps: { color: 'brand' },
          })
        }}
      >
        {finished ? '比赛结束' : !user ? '请先登录' : GameActionMap.get(status)}
      </Button>
      {started && <Button onClick={() => navigate(`/games/${numId}/scoreboard`)}>查看榜单</Button>}
      {status === ParticipationStatus.Accepted && started && (
        <Button onClick={() => navigate(`/games/${numId}/challenges`)}>进入比赛</Button>
      )}
    </>
  )

  return (
    <WithNavBar width="100%" padding={0} isLoading={!game}>
      <div ref={targetRef} className={classes.root}>
        <Group
          noWrap
          position="apart"
          style={{ width: '100%', padding: `0 ${theme.spacing.md}px` }}
          className={classes.container}
        >
          <Stack spacing={6} className={classes.flexGrowAtSm}>
            <Group>
              <Badge variant="outline">
                {game?.limit === 0 ? '多' : game?.limit === 1 ? '个' : game?.limit}人赛
              </Badge>
            </Group>
            <Stack spacing={2}>
              <Title className={classes.title}>{game?.title}</Title>
              <Text size="sm" color="dimmed">
                <Text span weight={700}>
                  {`${game?.teamCount ?? 0} `}
                </Text>
                支队伍已报名
              </Text>
            </Stack>
            <Group position="apart">
              <Stack spacing={0}>
                <Text size="sm" className={classes.date}>
                  开始时间
                </Text>
                <Text size="sm" weight={700} className={classes.date}>
                  {startTime.format('HH:mm:ss, MMMM DD, YYYY')}
                </Text>
              </Stack>
              <Stack spacing={0}>
                <Text size="sm" className={classes.date}>
                  结束时间
                </Text>
                <Text size="sm" weight={700} className={classes.date}>
                  {endTime.format('HH:mm:ss, MMMM DD, YYYY')}
                </Text>
              </Stack>
            </Group>
            <CustomProgress percentage={progress * 100} />
            <Group>{ControlButtons}</Group>
          </Stack>
          <BackgroundImage className={classes.banner} src={game?.poster ?? ''} radius="sm">
            <Center style={{ height: '100%' }}>
              {!game?.poster && (
                <Icon path={mdiFlagOutline} size={4} color={theme.colors.gray[5]} />
              )}
            </Center>
          </BackgroundImage>
        </Group>
      </div>
      <Container className={classes.content}>
        <Stack spacing="xs">
          {GetAlert(status)}
          {teamRequire && (
            <Alert color="yellow" icon={<Icon path={mdiAlertCircle} />} title="当前无法报名">
              你不是当前所激活队伍的队长，请在{' '}
              <Anchor component={Link} to="/teams">
                队伍管理
              </Anchor>{' '}
              页面创建、加入或切换队伍状态。
            </Alert>
          )}
          {status === ParticipationStatus.Accepted && !started && (
            <Alert color="teal" icon={<Icon path={mdiCheck} />} title="比赛尚未开始">
              当前激活队伍已经成功报名，请耐心等待比赛开始。
            </Alert>
          )}
          <TypographyStylesProvider className={typographyClasses.root}>
            <div dangerouslySetInnerHTML={{ __html: marked(game?.content ?? '') }} />
          </TypographyStylesProvider>
        </Stack>
      </Container>
    </WithNavBar>
  )
}

export default GameDetail
