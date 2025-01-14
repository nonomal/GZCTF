import React, { FC, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Center, Loader } from '@mantine/core'
import api, { Role } from '@Api'

interface WithRoleProps {
  requiredRole: Role
  children?: React.ReactNode
}

export const RoleMap = new Map<Role, number>([
  [Role.Admin, 3],
  [Role.Monitor, 1],
  [Role.User, 0],
  [Role.Banned, -1],
])

const WithRole: FC<WithRoleProps> = ({ requiredRole, children }) => {
  const { data: user, error } = api.account.useAccountProfile({
    refreshInterval: 0,
    revalidateIfStale: false,
    revalidateOnFocus: false,
  })

  const navigate = useNavigate()
  const location = useLocation()

  const required = RoleMap.get(requiredRole)!

  useEffect(() => {
    if (error && error.status === 401)
      navigate(`/account/login?from=${location.pathname}`, { replace: true })

    if (!user?.role) return

    const current = RoleMap.get(user?.role ?? Role.User)!

    if (current < required) navigate('/404')
  }, [user, error, required, navigate])

  if (!user || RoleMap.get(user?.role ?? Role.User)! < required /* show loader before redirect */) {
    return (
      <Center style={{ height: 'calc(100vh - 32px)' }}>
        <Loader />
      </Center>
    )
  }

  return <>{children}</>
}

export default WithRole
