import { FC, useState } from 'react'
import {
  Stack,
  SimpleGrid,
  Loader,
  Center,
  Group,
  Button,
  Modal,
  TextInput,
  Text,
  Title,
  useMantineTheme,
} from '@mantine/core'
import { showNotification } from '@mantine/notifications'
import { mdiAccountMultiplePlus, mdiCheck, mdiClose, mdiHumanGreetingVariant } from '@mdi/js'
import { Icon } from '@mdi/react'
import LogoHeader from '@Components/LogoHeader'
import TeamCard from '@Components/TeamCard'
import TeamCreateModal from '@Components/TeamCreateModal'
import TeamEditModal from '@Components/TeamEditModal'
import WithNavBar from '@Components/WithNavbar'
import WithRole from '@Components/WithRole'
import { showErrorNotification } from '@Utils/ApiErrorHandler'
import { usePageTitle } from '@Utils/PageTitle'
import api, { TeamInfoModel, Role } from '@Api'

const Teams: FC = () => {
  const { data: user, error: userError } = api.account.useAccountProfile({
    refreshInterval: 0,
    revalidateIfStale: false,
    revalidateOnFocus: false,
  })

  const { data: teams, error: teamsError } = api.team.useTeamGetTeamsInfo({
    refreshInterval: 120000,
  })

  const theme = useMantineTheme()

  const [joinOpened, setJoinOpened] = useState(false)
  const [joinTeamCode, setJoinTeamCode] = useState('')

  const [createOpened, setCreateOpened] = useState(false)

  const [editOpened, setEditOpened] = useState(false)
  const [editTeam, setEditTeam] = useState<TeamInfoModel | null>(null)

  const ownTeam = teams?.some((t) => t.members?.some((m) => m?.captain && m.id == user?.userId))

  const onEditTeam = (team: TeamInfoModel) => {
    setEditTeam(team)
    setEditOpened(true)
  }

  const codePartten = /:\d+:[0-9a-f]{32}$/

  const onJoinTeam = () => {
    if (!codePartten.test(joinTeamCode)) {
      showNotification({
        color: 'red',
        title: '遇到了问题',
        message: '队伍邀请码格式不正确',
        icon: <Icon path={mdiClose} size={1} />,
        disallowClose: true,
      })
      return
    }

    api.team
      .teamAccept(joinTeamCode)
      .then(() => {
        showNotification({
          color: 'teal',
          title: '加入队伍成功',
          message: '队伍信息已更新',
          icon: <Icon path={mdiCheck} size={1} />,
          disallowClose: true,
        })
        api.team.mutateTeamGetTeamsInfo()
        if (!user?.activeTeamId) {
          api.account.mutateAccountProfile({
            activeTeamId: parseInt(joinTeamCode.split(':').slice(-2)[0]),
            ...user,
          })
        }
      })
      .catch(showErrorNotification)
      .finally(() => {
        setJoinTeamCode('')
        setJoinOpened(false)
      })
  }

  usePageTitle('队伍管理')

  //Divide teams into Active & Inactive
  const activeTeam = teams?.filter((t) => t.id === user?.activeTeamId)[0]
  const teamsInactive = teams?.filter((t) => t.id !== user?.activeTeamId)

  return (
    <WithNavBar>
      <WithRole requiredRole={Role.User}>
        <Stack>
          <Group position="apart">
            <LogoHeader />
            <Group position="right">
              <Button
                leftIcon={<Icon path={mdiHumanGreetingVariant} size={1} />}
                variant={theme.colorScheme === 'dark' ? 'outline' : 'filled'}
                onClick={() => setJoinOpened(true)}
              >
                加入队伍
              </Button>
              <Button
                leftIcon={<Icon path={mdiAccountMultiplePlus} size={1} />}
                variant={theme.colorScheme === 'dark' ? 'outline' : 'filled'}
                onClick={() => setCreateOpened(true)}
              >
                创建队伍
              </Button>
            </Group>
          </Group>
          {teams && !teamsError && user && !userError ? (
            <>
              {activeTeam && (
                <>
                  <Title
                    order={2}
                    style={{
                      fontSize: '6rem',
                      fontWeight: 'bold',
                      opacity: 0.15,
                      height: '4.5rem',
                      paddingLeft: '1rem',
                      color: theme.colors.brand[theme.colorScheme === 'dark' ? 2 : 6],
                      userSelect: 'none',
                      marginTop: '-1.5rem',
                    }}
                  >
                    ACTIVE
                  </Title>
                  <TeamCard
                    team={activeTeam}
                    isActive={true}
                    isCaptain={
                      activeTeam.members?.some((m) => m?.captain && m.id == user?.userId) ?? false
                    }
                    onEdit={() => onEditTeam(activeTeam)}
                  />
                </>
              )}
              {teamsInactive && teamsInactive.length > 0 && (
                <>
                  <Title
                    order={2}
                    style={{
                      fontSize: '6rem',
                      fontWeight: 'bold',
                      opacity: 0.1,
                      height: '4.5rem',
                      paddingLeft: '1rem',
                      userSelect: 'none',
                    }}
                  >
                    INACTIVE
                  </Title>
                  <SimpleGrid
                    cols={3}
                    spacing="lg"
                    breakpoints={[
                      { maxWidth: 1600, cols: 2, spacing: 'md' },
                      { maxWidth: 800, cols: 1, spacing: 'sm' },
                    ]}
                  >
                    {teams.map(
                      (t, i) =>
                        t.id !== user?.activeTeamId && (
                          <TeamCard
                            key={i}
                            team={t}
                            isActive={t.id === user?.activeTeamId}
                            isCaptain={
                              t.members?.some((m) => m?.captain && m.id == user?.userId) ?? false
                            }
                            onEdit={() => onEditTeam(t)}
                            mutateActive={() => {
                              api.account.mutateAccountProfile({
                                activeTeamId: t.id!,
                                ...user,
                              })
                            }}
                          />
                        )
                    )}
                  </SimpleGrid>
                </>
              )}
            </>
          ) : (
            <Center style={{ width: '100%', height: '80wh' }}>
              <Loader />
            </Center>
          )}
        </Stack>

        <Modal
          opened={joinOpened}
          centered
          title="加入已有队伍"
          onClose={() => setJoinOpened(false)}
        >
          <Stack>
            <Text size="sm">请从队伍创建者处获取队伍邀请码，输入邀请码加入队伍。</Text>
            <TextInput
              label="邀请码"
              type="text"
              placeholder="team:0:01234567890123456789012345678901"
              style={{ width: '100%' }}
              value={joinTeamCode}
              onChange={(event) => setJoinTeamCode(event.currentTarget.value)}
            />
            <Button fullWidth variant="outline" onClick={onJoinTeam}>
              加入队伍
            </Button>
          </Stack>
        </Modal>

        <TeamCreateModal
          opened={createOpened}
          centered
          title="创建新队伍"
          isOwnTeam={ownTeam ?? false}
          onClose={() => setCreateOpened(false)}
          mutateActive={(id) => {
            if (!user?.activeTeamId) {
              api.account.mutateAccountProfile({
                activeTeamId: id,
                ...user,
              })
            }
          }}
        />

        <TeamEditModal
          opened={editOpened}
          centered
          title="队伍详情"
          onClose={() => setEditOpened(false)}
          team={editTeam}
          isCaptain={editTeam?.members?.some((m) => m?.captain && m.id == user?.userId) ?? false}
        />
      </WithRole>
    </WithNavBar>
  )
}

export default Teams
