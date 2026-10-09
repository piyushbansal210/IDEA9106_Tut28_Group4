import type { SaleStatus, Show } from './types'
import { useStore } from './store'
import { usePresale } from './presale'
import { navigate } from './router'
import { primaryAction, showPath } from './sale'

const order: SaleStatus[] = ['queue-open', 'waiting-room', 'on-sale', 'presale-soon', 'announced', 'sold-out']

// The show a tour card should feature: the one with the most "live" sale right now.
export function useFeaturedShow() {
  const { shows, statusOf } = useStore()
  return (tourId: string): Show | undefined =>
    shows
      .filter((s) => s.tourId === tourId)
      .sort((a, b) => order.indexOf(statusOf(a)) - order.indexOf(statusOf(b)) || a.saleOpensAt.localeCompare(b.saleOpensAt))[0]
}

// Label for a show's primary button, aware of pre-registration.
export function useActionLabel() {
  const store = useStore()
  const presale = usePresale()
  return (show: Show) => {
    const status = store.statusOf(show)
    if ((status === 'announced' || status === 'presale-soon') && presale.registrationFor(show.id)) return 'My pre-sale hub'
    return primaryAction[status]
  }
}

// What the single primary button does for a show, given its sale status. Account-only steps ask to log in
// first and then carry on with exactly what the user tried to do.
export function useShowAction() {
  const store = useStore()
  const presale = usePresale()
  return (show: Show) => {
    const status = store.statusOf(show)
    const goWithPlan = (page: 'waiting' | 'queue') => {
      if (store.planFor(show.id)) navigate(showPath(show, page))
      else navigate(`/tour/${show.tourId}?plan=${show.id}&then=${page}`)
    }

    switch (status) {
      case 'announced':
      case 'presale-soon':
        // Registered fans go to their pre-sale hub; everyone else pre-registers (login first).
        return presale.registrationFor(show.id) ? navigate(showPath(show, 'hub')) : presale.openPreRegister(show.id)
      case 'waiting-room':
        return store.requireLogin('Log in to join the waiting room. Your ticket plan is saved to your account.', () => goWithPlan('waiting'))
      case 'queue-open':
        return store.requireLogin('Log in to join the queue. Your ticket plan is saved to your account.', () => goWithPlan('queue'))
      case 'on-sale':
        return store.requireLogin('Log in to buy tickets.', () => navigate(showPath(show, 'seats')))
      case 'sold-out':
        return store.requireLogin('Log in to join the waitlist.', () => navigate(`${showPath(show, 'outcome')}?r=sold-out`))
    }
  }
}
